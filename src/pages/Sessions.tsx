import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle } from "lucide-react";

interface Session {
  id: string;
  student_id: string;
  status: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  zoom_join_url: string | null;
  notes: string | null;
  students: {
    first_name: string;
    last_name: string;
  };
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  price_per_hour: number;
}

const Sessions = () => {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    student_id: "",
    scheduled_start_at: "",
    scheduled_end_at: "",
    notes: "",
  });

  useEffect(() => {
    loadSessions();
    loadStudents();
  }, []);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select(`
        *,
        students (
          first_name,
          last_name
        )
      `)
      .order("scheduled_start_at", { ascending: false });

    if (error) {
      toast({
        title: t("sessions.errorLoading"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSessions(data || []);
    }
  };

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name, price_per_hour")
      .eq("is_active", true)
      .order("first_name");

    if (error) {
      toast({
        title: "Error loading students",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStudents(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that end time is after start time
    if (formData.scheduled_start_at && formData.scheduled_end_at) {
      const startTime = new Date(formData.scheduled_start_at);
      const endTime = new Date(formData.scheduled_end_at);
      
      if (endTime <= startTime) {
      toast({
        title: t("sessions.invalidTimeRange"),
        description: t("sessions.endTimeAfterStart"),
        variant: "destructive",
      });
        return;
      }
    }

    // Check if user has Zoom integrated
    const { data: { user } } = await supabase.auth.getUser();
    let zoomData = null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("zoom_api_key, zoom_api_secret")
        .eq("id", user.id)
        .single();

      if (profile?.zoom_api_key && profile?.zoom_api_secret) {
        // Calculate duration in minutes
        const startTime = new Date(formData.scheduled_start_at);
        const endTime = new Date(formData.scheduled_end_at);
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        // Get student name for meeting topic
        const selectedStudent = students.find(s => s.id === formData.student_id);
        const topic = selectedStudent 
          ? `Tutoring Session - ${selectedStudent.first_name} ${selectedStudent.last_name}`
          : "Tutoring Session";

        try {
          // Create Zoom meeting via Edge Function
          const { data: zoomMeeting, error: zoomError } = await supabase.functions.invoke('create-zoom-meeting', {
            body: {
              start_time: formData.scheduled_start_at,
              duration: durationMinutes,
              topic: topic,
            },
          });

          if (!zoomError && zoomMeeting) {
            zoomData = {
              zoom_meeting_id: zoomMeeting.id,
              zoom_join_url: zoomMeeting.join_url,
              zoom_start_url: zoomMeeting.start_url,
            };
          } else if (zoomError) {
            console.error("Zoom API error:", zoomError);
            toast({
              title: "Session created",
              description: zoomError.message || "Zoom meeting could not be created, but session was scheduled",
              variant: "destructive",
            });
          }
        } catch (error: any) {
          console.error("Error creating Zoom meeting:", error);
          toast({
            title: "Session created",
            description: error.message || "Zoom meeting could not be created, but session was scheduled",
            variant: "destructive",
          });
          // Continue without Zoom if it fails
        }
      }
    }

    const { error } = await supabase.from("sessions").insert({
      student_id: formData.student_id,
      scheduled_start_at: formData.scheduled_start_at,
      scheduled_end_at: formData.scheduled_end_at,
      notes: formData.notes || null,
      status: "SCHEDULED",
      ...zoomData,
    });

    if (error) {
      toast({
        title: t("sessions.errorCreating"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ 
        title: t("sessions.sessionScheduled"),
        description: zoomData ? t("sessions.zoomLinkCreated") : undefined,
      });
      setIsDialogOpen(false);
      resetForm();
      loadSessions();
    }
  };

  const handleComplete = async (sessionId: string) => {
    // First, get the session details
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const now = new Date().toISOString();
    
    // Check if ledger entry already exists for this session
    const sessionDate = new Date(session.scheduled_start_at).toLocaleDateString();
    const sessionReference = `Session ${sessionId} on ${sessionDate}`;
    const { data: existingEntries } = await supabase
      .from("ledger_entries")
      .select("id")
      .eq("student_id", session.student_id)
      .eq("type", "SESSION_CHARGE")
      .like("reference", `%Session ${sessionId}%`)
      .limit(1);

    // Update session status
    const { error: sessionError } = await supabase
      .from("sessions")
      .update({
        status: "COMPLETED",
        actual_start_at: now,
        actual_end_at: now,
      })
      .eq("id", sessionId);

    if (sessionError) {
      toast({
        title: "Error completing session",
        description: sessionError.message,
        variant: "destructive",
      });
      return;
    }

    // Only create ledger entry if it doesn't already exist
    if (existingEntries && existingEntries.length > 0) {
      toast({ title: "Session completed (ledger entry already exists)" });
      loadSessions();
      return;
    }

    // Get student's price per hour
    const student = students.find(s => s.id === session.student_id);
    if (!student) {
      toast({
        title: "Session completed",
        description: "Could not create ledger entry - student not found",
        variant: "destructive",
      });
      loadSessions();
      return;
    }

    // Calculate session duration in hours
    const startTime = new Date(session.scheduled_start_at);
    const endTime = new Date(session.scheduled_end_at);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    // Create ledger entry (negative amount for charge)
    const chargeAmount = -(durationHours * Number(student.price_per_hour));
    
    // Get current user for created_by field
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error: ledgerError } = await supabase
      .from("ledger_entries")
      .insert({
        student_id: session.student_id,
        type: "SESSION_CHARGE",
        amount: chargeAmount,
        reference: sessionReference,
        created_by: user?.id || null,
      });

    if (ledgerError) {
      toast({
        title: "Session completed but ledger entry failed",
        description: ledgerError.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Session completed and charge added to ledger" });
    }
    
    loadSessions();
  };

  const handleCancel = async (sessionId: string) => {
    const { error } = await supabase
      .from("sessions")
      .update({ status: "CANCELED" })
      .eq("id", sessionId);

    if (error) {
      toast({
        title: "Error canceling session",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Session canceled" });
      loadSessions();
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      scheduled_start_at: "",
      scheduled_end_at: "",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      SCHEDULED: "default",
      COMPLETED: "secondary",
      CANCELED: "destructive",
      NO_SHOW: "destructive",
    };
    const statusKey = status.toLowerCase();
    return <Badge variant={variants[status] || "default"}>{t(`sessions.status.${statusKey}`)}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{t("sessions.title")}</h1>
            <p className="text-muted-foreground mt-2">{t("sessions.description")}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("sessions.scheduleSession")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("sessions.newSession")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student_id">{t("sessions.student")}</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("sessions.selectStudent")} />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_start_at">{t("sessions.startTime")}</Label>
                  <Input
                    id="scheduled_start_at"
                    type="datetime-local"
                    value={formData.scheduled_start_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_start_at: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_end_at">{t("sessions.endTime")}</Label>
                  <Input
                    id="scheduled_end_at"
                    type="datetime-local"
                    value={formData.scheduled_end_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_end_at: e.target.value })}
                    min={formData.scheduled_start_at || undefined}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">{t("sessions.notesOptional")}</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {t("sessions.schedule")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("sessions.allSessions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sessions.student")}</TableHead>
                  <TableHead>{t("sessions.startTime")}</TableHead>
                  <TableHead>{t("sessions.endTime")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("sessions.zoomLink")}</TableHead>
                  <TableHead>{t("common.notes")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.students.first_name} {session.students.last_name}
                    </TableCell>
                    <TableCell>
                      {new Date(session.scheduled_start_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(session.scheduled_end_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      {session.zoom_join_url ? (
                        <a
                          href={session.zoom_join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          {t("common.joinMeeting")}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {session.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === "SCHEDULED" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleComplete(session.id)}
                          >
                            <CheckCircle className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(session.id)}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t("sessions.noSessions")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Sessions;
