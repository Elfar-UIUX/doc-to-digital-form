import { useEffect, useState } from "react";
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
        title: "Error loading sessions",
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

    const { error } = await supabase.from("sessions").insert({
      student_id: formData.student_id,
      scheduled_start_at: formData.scheduled_start_at,
      scheduled_end_at: formData.scheduled_end_at,
      notes: formData.notes || null,
      status: "SCHEDULED",
    });

    if (error) {
      toast({
        title: "Error creating session",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Session scheduled successfully" });
      setIsDialogOpen(false);
      resetForm();
      loadSessions();
    }
  };

  const handleComplete = async (sessionId: string) => {
    const { error } = await supabase
      .from("sessions")
      .update({
        status: "COMPLETED",
        actual_start_at: new Date().toISOString(),
        actual_end_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      toast({
        title: "Error completing session",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Session marked as completed" });
      loadSessions();
    }
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
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sessions</h1>
            <p className="text-muted-foreground mt-2">Schedule and manage tutoring sessions</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule New Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
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
                  <Label htmlFor="scheduled_start_at">Start Time</Label>
                  <Input
                    id="scheduled_start_at"
                    type="datetime-local"
                    value={formData.scheduled_start_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_start_at: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_end_at">End Time</Label>
                  <Input
                    id="scheduled_end_at"
                    type="datetime-local"
                    value={formData.scheduled_end_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_end_at: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Schedule
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No sessions found. Schedule your first session to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Sessions;
