import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign } from "lucide-react";

interface LedgerEntry {
  id: string;
  student_id: string;
  type: string;
  amount: number;
  reference: string | null;
  created_at: string;
  students: {
    first_name: string;
    last_name: string;
  };
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface StudentBalance {
  studentId: string;
  studentName: string;
  balance: number;
}

const Ledger = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [balances, setBalances] = useState<StudentBalance[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    student_id: "",
    type: "PAYMENT_CONFIRMATION",
    amount: "",
    reference: "",
  });

  useEffect(() => {
    loadEntries();
    loadStudents();
    loadBalances();
  }, []);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select(`
        *,
        students (
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading ledger",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEntries(data || []);
    }
  };

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name")
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

  const loadBalances = async () => {
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, first_name, last_name");

    if (!studentsData) return;

    const balancePromises = studentsData.map(async (student) => {
      const { data, error } = await supabase.rpc("get_student_balance", {
        student_uuid: student.id,
      });

      return {
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        balance: error ? 0 : (data || 0),
      };
    });

    const balancesData = await Promise.all(balancePromises);
    setBalances(balancesData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const entryData: any = {
      student_id: formData.student_id,
      type: formData.type,
      amount: parseFloat(formData.amount),
      reference: formData.reference || null,
    };

    const { error } = await supabase.from("ledger_entries").insert(entryData);

    if (error) {
      toast({
        title: "Error creating entry",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Ledger entry created successfully" });
      setIsDialogOpen(false);
      resetForm();
      loadEntries();
      loadBalances();
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      type: "PAYMENT_CONFIRMATION",
      amount: "",
      reference: "",
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Financial Ledger</h1>
            <p className="text-muted-foreground mt-2">Track payments and session charges</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Ledger Entry</DialogTitle>
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
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAYMENT_CONFIRMATION">Payment</SelectItem>
                      <SelectItem value="SESSION_CHARGE">Session Charge</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="Positive for payments, negative for charges"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (Optional)</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Add Entry
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {balances.map((balance) => (
            <Card key={balance.studentId}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {balance.studentName}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  balance.balance >= 0 ? "text-success" : "text-destructive"
                }`}>
                  ${balance.balance.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {balance.balance >= 0 ? "Credit" : "Owed"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.students.first_name} {entry.students.last_name}
                    </TableCell>
                    <TableCell>{entry.type.replace(/_/g, " ")}</TableCell>
                    <TableCell className={entry.amount >= 0 ? "text-success" : "text-destructive"}>
                      ${Math.abs(entry.amount).toFixed(2)}
                      {entry.amount >= 0 ? " +" : " -"}
                    </TableCell>
                    <TableCell>{entry.reference || "-"}</TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No entries found. Add your first transaction to get started.
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

export default Ledger;
