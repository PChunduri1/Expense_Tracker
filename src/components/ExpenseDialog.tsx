import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: any;
}

const expenseSchema = z.object({
  amount: z.number().positive({ message: "Amount must be positive" }),
  description: z.string().min(1, { message: "Description is required" }).max(200),
  category_id: z.string().uuid({ message: "Please select a category" }),
  date: z.string().min(1, { message: "Date is required" }),
});

const ExpenseDialog = ({ open, onOpenChange, expense }: ExpenseDialogProps) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (expense) {
      setFormData({
        amount: expense.amount.toString(),
        description: expense.description || "",
        category_id: expense.category_id || "",
        date: expense.date,
      });
    } else {
      setFormData({
        amount: "",
        description: "",
        category_id: "",
        date: new Date().toISOString().split("T")[0],
      });
    }
  }, [expense]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("expense_categories").select("*");
    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = expenseSchema.parse({
        ...formData,
        amount: parseFloat(formData.amount),
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (expense) {
        const { error } = await supabase
          .from("expenses")
          .update({
            amount: validated.amount,
            description: validated.description,
            category_id: validated.category_id,
            date: validated.date,
          })
          .eq("id", expense.id);

        if (error) throw error;
        toast.success("Expense updated successfully");
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert([{
            amount: validated.amount,
            description: validated.description,
            category_id: validated.category_id,
            date: validated.date,
            user_id: user.id,
          }]);

        if (error) throw error;
        toast.success("Expense added successfully");
      }

      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to save expense");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{expense ? "Edit Expense" : "Add Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What did you spend on?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{expense ? "Update" : "Add"} Expense</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseDialog;
