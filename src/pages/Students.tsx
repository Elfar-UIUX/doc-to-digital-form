import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_e164: string;
  country: string;
  price_per_hour: number;
  is_active: boolean;
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
      setStudents(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const studentData = {
      ...formData,
      price_per_hour: parseFloat(formData.price_per_hour),
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
    });
    setIsDialogOpen(true);
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
    });
    setEditingStudent(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Students</h1>
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
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_e164">Phone (E.164 format)</Label>
                  <Input
                    id="phone_e164"
                    placeholder="+1234567890"
                    value={formData.phone_e164}
                    onChange={(e) => setFormData({ ...formData, phone_e164: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_hour">Price per Hour ($)</Label>
                  <Input
                    id="price_per_hour"
                    type="number"
                    step="0.01"
                    value={formData.price_per_hour}
                    onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                    required
                  />
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

        <Card>
          <CardHeader>
            <CardTitle>All Students</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Price/Hour</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.first_name} {student.last_name}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.phone_e164}</TableCell>
                    <TableCell>{student.country}</TableCell>
                    <TableCell>${student.price_per_hour}</TableCell>
                    <TableCell>
                      <Badge variant={student.is_active ? "default" : "secondary"}>
                        {student.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No students found. Add your first student to get started.
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

export default Students;
