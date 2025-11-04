import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertCircle, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BudgetTracker = () => {
  const [budget, setBudget] = useState<any>(null);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");

  useEffect(() => {
    fetchBudget();
    fetchMonthlySpending();
  }, []);

  const fetchBudget = async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const { data } = await supabase
      .from("budgets")
      .select("*")
      .eq("month", month)
      .maybeSingle();

    if (data) {
      setBudget(data);
      setBudgetAmount(data.limit_amount.toString());
    }
  };

  const fetchMonthlySpending = async () => {
    const now = new Date();
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const { data } = await supabase
      .from("expenses")
      .select("amount")
      .gte("date", firstDayOfMonth);

    if (data) {
      const total = data.reduce((sum, exp) => sum + Number(exp.amount), 0);
      setMonthlySpending(total);
    }
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(budgetAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("budgets")
      .upsert({
        user_id: user.id,
        month,
        limit_amount: amount,
      }, {
        onConflict: "user_id,month",
      });

    if (error) {
      toast.error("Failed to set budget");
    } else {
      toast.success("Budget set successfully");
      setDialogOpen(false);
      fetchBudget();
    }
  };

  const percentage = budget ? (monthlySpending / Number(budget.limit_amount)) * 100 : 0;
  const isOverBudget = percentage > 100;
  const isNearLimit = percentage > 80 && percentage <= 100;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Monthly Budget</CardTitle>
        <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm">
          {budget ? "Update" : "Set"} Budget
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {budget ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Spent</span>
                <span className="font-medium">
                  ${monthlySpending.toFixed(2)} of ${Number(budget.limit_amount).toFixed(2)}
                </span>
              </div>
              <Progress 
                value={Math.min(percentage, 100)} 
                className={isOverBudget ? "bg-destructive/20" : isNearLimit ? "bg-warning/20" : ""}
              />
              <p className="text-xs text-muted-foreground text-right">
                {percentage.toFixed(1)}% used
              </p>
            </div>

            {isOverBudget && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You've exceeded your budget by ${(monthlySpending - Number(budget.limit_amount)).toFixed(2)}
                </AlertDescription>
              </Alert>
            )}

            {isNearLimit && !isOverBudget && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  You're approaching your budget limit. ${(Number(budget.limit_amount) - monthlySpending).toFixed(2)} remaining.
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No budget set for this month</p>
            <Button onClick={() => setDialogOpen(true)}>Set Monthly Budget</Button>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Monthly Budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSetBudget} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget Amount</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Budget</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BudgetTracker;
