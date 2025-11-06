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
import { Plus, DollarSign, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface LedgerEntry {
  id: string;
  student_id: string;
  type: string;
  amount: number;
  reference: string | null;
  image_url: string | null;
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
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    student_id: "",
    type: "PAYMENT_CONFIRMATION",
    amount: "",
    reference: "",
    isAdjustmentNegative: false, // For ADJUSTMENT type only
    imageFile: null as File | null,
    existingImageUrl: null as string | null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadEntries();
    loadStudents();
    loadBalances();
  }, []);

  const loadEntries = async () => {
    console.log('Loading entries from database...');
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
      console.error('Error loading entries:', error);
      toast({
        title: "Error loading ledger",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log('Entries loaded:', data?.length || 0, 'entries');
      if (data && data.length > 0) {
        // Log first few entries to verify data
        data.slice(0, 3).forEach((entry, idx) => {
          console.log(`Entry ${idx + 1}:`, {
            id: entry.id,
            amount: entry.amount,
            type: entry.type,
            student: `${entry.students?.first_name} ${entry.students?.last_name}`
          });
        });
      }
      // Force update by creating a new array reference
      setEntries([...(data || [])]);
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
    setIsUploading(true);

    // Log current formData state at submit time
    console.log('FormData at submit:', {
      ...formData,
      isAdjustmentNegative: formData.isAdjustmentNegative
    });

    const amountValue = parseFloat(formData.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Invalid amount",
        description: "Amount must be a positive number",
        variant: "destructive",
      });
      setIsUploading(false);
      return;
    }

    // Apply sign based on ledger type
    let finalAmount: number;
    if (formData.type === "SESSION_CHARGE") {
      finalAmount = -amountValue; // Negative for charges
    } else if (formData.type === "PAYMENT_CONFIRMATION") {
      finalAmount = amountValue; // Positive for payments
    } else if (formData.type === "ADJUSTMENT") {
      // Use the current formData state
      const isNegative = formData.isAdjustmentNegative;
      finalAmount = isNegative ? -amountValue : amountValue;
      console.log('Adjustment calculation:', {
        amountValue,
        isAdjustmentNegative: isNegative,
        finalAmount,
        formDataState: formData.isAdjustmentNegative
      });
    } else {
      finalAmount = amountValue;
    }

    // Get current user for created_by field
    const { data: { user } } = await supabase.auth.getUser();
    let imageUrl: string | null = null;

    console.log('Image upload check:', {
      hasImageFile: !!formData.imageFile,
      hasExistingImage: !!formData.existingImageUrl,
      isEditing: !!editingEntry
    });

    // Upload image if provided
    if (formData.imageFile) {
      try {
        const bucketName = 'ledger-images';
        const fileExt = formData.imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = fileName;

        // Try to upload directly - if bucket doesn't exist, we'll get a clear error
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, formData.imageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          
          // Check for various bucket-related errors
          const errorMessage = uploadError.message.toLowerCase();
          if (
            errorMessage.includes('bucket') || 
            errorMessage.includes('not found') ||
            errorMessage.includes('does not exist') ||
            uploadError.statusCode === '404' ||
            uploadError.statusCode === 404
          ) {
            toast({
              title: "Storage bucket not found",
              description: `The bucket "${bucketName}" was not found. Please verify it exists in Supabase Dashboard → Storage and is set to public. Error: ${uploadError.message}`,
              variant: "destructive",
              duration: 15000,
            });
          } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
            toast({
              title: "Permission denied",
              description: `Upload failed due to permissions. Please check your storage policies in Supabase Dashboard → Storage → Policies. Error: ${uploadError.message}`,
              variant: "destructive",
              duration: 15000,
            });
          } else {
            toast({
              title: "Error uploading image",
              description: `Upload failed: ${uploadError.message}. Please check your Supabase storage configuration.`,
              variant: "destructive",
              duration: 10000,
            });
          }
          setIsUploading(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
        console.log('Image uploaded successfully:', imageUrl);
      } catch (error: any) {
        console.error('Unexpected upload error:', error);
        toast({
          title: "Error uploading image",
          description: error?.message || "An unexpected error occurred. Please check your browser console for details.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
    } else {
      console.log('No new image file, using existing image if available');
    }

    console.log('Creating entryData, imageUrl:', imageUrl, 'existingImageUrl:', formData.existingImageUrl);
    console.log('editingEntry check:', !!editingEntry, editingEntry?.id);

    const entryData: any = {
      student_id: formData.student_id,
      type: formData.type,
      amount: finalAmount,
      reference: formData.reference || null,
      image_url: imageUrl || formData.existingImageUrl || null,
    };

    console.log('About to check if editing, entryData:', entryData);

    if (editingEntry) {
      // Update existing entry
      console.log('Updating entry - START:', {
        entryId: editingEntry.id,
        entryData,
        originalAmount: editingEntry.amount,
        newAmount: finalAmount,
        type: formData.type,
        isAdjustmentNegative: formData.isAdjustmentNegative
      });
      
      const { data, error } = await supabase
        .from("ledger_entries")
        .update(entryData)
        .eq("id", editingEntry.id)
        .select(`
          *,
          students (
            first_name,
            last_name
          )
        `);

      if (error) {
        console.error('❌ Update error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Check if it's a permissions/RLS error
        if (error.message?.includes('policy') || error.message?.includes('permission') || error.message?.includes('row-level security')) {
          toast({
            title: "Permission Denied",
            description: "UPDATE policy is missing. Please run the migration to add UPDATE policy for ledger_entries table.",
            variant: "destructive",
            duration: 15000,
          });
        } else {
          toast({
            title: "Error updating entry",
            description: error.message,
            variant: "destructive",
          });
        }
        setIsUploading(false);
        return;
      }

      console.log('Update successful, returned data:', data);
      
      // If update returns empty array, it might still have succeeded but RLS is blocking the SELECT
      if (!data || data.length === 0) {
        console.warn('⚠️ Update returned empty array - this might indicate RLS policy issue');
      }
      
      // Verify the update actually happened by fetching the entry again
      const { data: verifyData, error: verifyError } = await supabase
        .from("ledger_entries")
        .select("*")
        .eq("id", editingEntry.id)
        .single();
      
      if (verifyError) {
        console.error('Error verifying update:', verifyError);
      } else {
        console.log('✅ Verified updated entry from DB:', verifyData);
        console.log('✅ Amount in database:', verifyData.amount);
        console.log('✅ Expected amount:', finalAmount);
      }
      
      toast({ title: "Ledger entry updated successfully" });
      setIsDialogOpen(false);
      resetForm();
      setEditingEntry(null);
      
      // Reload immediately and also after a delay to ensure DB is updated
      console.log('Reloading entries immediately...');
      await loadEntries();
      await loadBalances();
      
      // Also reload after a short delay to catch any DB replication delay
      setTimeout(async () => {
        console.log('Reloading entries again after delay...');
        await loadEntries();
        await loadBalances();
        console.log('Delayed reload complete');
      }, 1000);
      
      setIsUploading(false);
    } else {
      // Create new entry
      entryData.created_by = user?.id || null;
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
    }
    setIsUploading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setFormData({ ...formData, imageFile: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    
    // Determine if adjustment is negative based on amount
    const isAdjustmentNegative = entry.type === "ADJUSTMENT" && entry.amount < 0;
    
    setFormData({
      student_id: entry.student_id,
      type: entry.type,
      amount: Math.abs(entry.amount).toString(),
      reference: entry.reference || "",
      isAdjustmentNegative: isAdjustmentNegative,
      imageFile: null,
      existingImageUrl: entry.image_url,
    });
    
    // Set image preview if existing image
    if (entry.image_url) {
      setImagePreview(entry.image_url);
    } else {
      setImagePreview(null);
    }
    
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      type: "PAYMENT_CONFIRMATION",
      amount: "",
      reference: "",
      isAdjustmentNegative: false,
      imageFile: null,
      existingImageUrl: null,
    });
    setImagePreview(null);
    setEditingEntry(null);
  };

  // Helper function to get amount sign description
  const getAmountSignDescription = () => {
    if (formData.type === "SESSION_CHARGE") {
      return "Will be negative (charge)";
    } else if (formData.type === "PAYMENT_CONFIRMATION") {
      return "Will be positive (payment)";
    } else if (formData.type === "ADJUSTMENT") {
      return formData.isAdjustmentNegative ? "Will be negative" : "Will be positive";
    }
    return "";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Financial Ledger</h1>
            <p className="text-muted-foreground mt-2">Track payments and session charges</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              resetForm();
              setEditingEntry(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? "Edit Ledger Entry" : "Add Ledger Entry"}
                </DialogTitle>
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
                    onValueChange={(value) => {
                      // Reset adjustment negative flag if type changes away from ADJUSTMENT
                      const newIsAdjustmentNegative = value === "ADJUSTMENT" ? formData.isAdjustmentNegative : false;
                      setFormData({ ...formData, type: value, isAdjustmentNegative: newIsAdjustmentNegative });
                    }}
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
                    min="0"
                    placeholder="Enter Amount"
                    value={formData.amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow positive numbers
                      if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                        setFormData({ ...formData, amount: value });
                      }
                    }}
                    required
                  />
                  {formData.amount && (
                    <p className="text-xs text-muted-foreground">
                      {getAmountSignDescription()}
                    </p>
                  )}
                </div>
                {formData.type === "ADJUSTMENT" && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isAdjustmentNegative"
                      checked={formData.isAdjustmentNegative}
                      onCheckedChange={(checked) => {
                        console.log('Toggling adjustment sign - current:', formData.isAdjustmentNegative, 'new:', checked);
                        setFormData((prev) => {
                          const updated = { ...prev, isAdjustmentNegative: checked };
                          console.log('Updated formData:', updated);
                          return updated;
                        });
                      }}
                    />
                    <Label htmlFor="isAdjustmentNegative" className="cursor-pointer">
                      Negative adjustment
                    </Label>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({formData.isAdjustmentNegative ? "Will be negative" : "Will be positive"})
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (Optional)</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Upload Image (Optional)</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {(imagePreview || formData.existingImageUrl) && (
                    <div className="mt-2">
                      <img
                        src={imagePreview || formData.existingImageUrl || ""}
                        alt="Preview"
                        className="w-full h-32 object-contain border rounded"
                      />
                      {formData.existingImageUrl && !imagePreview && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Current image (upload new image to replace)
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={isUploading}>
                    {isUploading ? "Uploading..." : editingEntry ? "Update Entry" : "Add Entry"}
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
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell>
                      {entry.image_url ? (
                        <a
                          href={entry.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <img
                            src={entry.image_url}
                            alt="Receipt"
                            className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                          />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No entries found. Add your first transaction to get started.
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

export default Ledger;
