import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, DollarSign, Phone, Calendar } from "lucide-react";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_e164: string;
  country: string;
  price_per_hour: number;
  is_active: boolean;
  balance?: number;
  sessionsCount?: number;
}

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_e164: "",
    country: "",
    price_per_hour: "",
    is_active: true,
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading students",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const studentsWithBalances = await Promise.all(
        (data || []).map(async (student) => {
          // Get balance
          const { data: balance } = await supabase.rpc("get_student_balance", {
            student_uuid: student.id,
          });
          
          // Get total sessions count
          const { count: sessionsCount } = await supabase
            .from("sessions")
            .select("*", { count: "exact", head: true })
            .eq("student_id", student.id);
          
          return {
            ...student,
            balance: balance || 0,
            sessionsCount: sessionsCount || 0,
          };
        })
      );
      setStudents(studentsWithBalances);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.first_name.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.last_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Last name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.phone_e164.trim()) {
      toast({
        title: "Validation Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price_per_hour || parseFloat(formData.price_per_hour) <= 0) {
      toast({
        title: "Validation Error",
        description: "Price per hour is required and must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    const studentData = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email?.trim() || null,
      phone_e164: formData.phone_e164.trim(),
      country: formData.country?.trim() || null,
      price_per_hour: parseFloat(formData.price_per_hour),
      is_active: formData.is_active,
    };

    if (editingStudent) {
      const { error } = await supabase
        .from("students")
        .update(studentData)
        .eq("id", editingStudent.id);

      if (error) {
        toast({
          title: "Error updating student",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Student updated successfully" });
        setIsDialogOpen(false);
        resetForm();
        loadStudents();
      }
    } else {
      const { error } = await supabase.from("students").insert(studentData);

      if (error) {
        toast({
          title: "Error creating student",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Student created successfully" });
        setIsDialogOpen(false);
        resetForm();
        loadStudents();
      }
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email || "",
      phone_e164: student.phone_e164 || "",
      country: student.country || "",
      price_per_hour: student.price_per_hour.toString(),
      is_active: student.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (student: Student) => {
    const newStatus = !student.is_active;
    
    const { error } = await supabase
      .from("students")
      .update({ is_active: newStatus })
      .eq("id", student.id);

    if (error) {
      toast({
        title: "Error updating student status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ 
        title: `Student ${newStatus ? "activated" : "deactivated"} successfully` 
      });
      loadStudents();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting student",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Student deleted successfully" });
      loadStudents();
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone_e164: "",
      country: "",
      price_per_hour: "",
      is_active: true,
    });
    setEditingStudent(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Students</h1>
            <p className="text-muted-foreground mt-2">Manage your student roster</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? "Edit Student" : "Add New Student"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_e164">Phone (E.164 format) *</Label>
                  <Input
                    id="phone_e164"
                    placeholder="+1234567890"
                    value={formData.phone_e164}
                    onChange={(e) => setFormData({ ...formData, phone_e164: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country (Optional)</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_hour">Price per Hour ($) *</Label>
                  <Input
                    id="price_per_hour"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">
                      Active Student
                    </Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingStudent ? "Update" : "Create"}
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

        {students.length === 0 ? (
        <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                No students found. Add your first student to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <Card key={student.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                      {student.first_name} {student.last_name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={student.is_active}
                        onCheckedChange={() => handleToggleStatus(student)}
                      />
                      <Badge variant={student.is_active ? "default" : "destructive"}>
                        {student.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Price/Hour</span>
                      <span className="font-semibold">${student.price_per_hour.toFixed(2)}</span>
                    </div>
                    {student.phone_e164 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          Phone
                        </span>
                        <span className="font-medium text-sm">{student.phone_e164}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Balance
                      </span>
                      <span className={`font-semibold ${
                        (student.balance || 0) >= 0 ? "text-success" : "text-destructive"
                      }`}>
                        ${(student.balance || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Total Sessions
                      </span>
                      <span className="font-semibold">{student.sessionsCount || 0}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(student)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(student.id)}
                        >
                      <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
          </CardContent>
        </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Students;
