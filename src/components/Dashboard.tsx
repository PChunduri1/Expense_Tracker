import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardStats {
  totalExpenses: number;
  monthlyExpenses: number;
  categorySummary: Array<{ category: string; amount: number; color: string }>;
  dailyTrend: Array<{ date: string; amount: number }>;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    monthlyExpenses: 0,
    categorySummary: [],
    dailyTrend: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all expenses
    const { data: expenses } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_categories (name, color)
      `)
      .order("date", { ascending: false });

    if (!expenses) return;

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Calculate monthly expenses
    const monthlyExpenses = expenses
      .filter((exp) => new Date(exp.date) >= firstDayOfMonth)
      .reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Category summary
    const categoryMap = new Map<string, { amount: number; color: string }>();
    expenses.forEach((exp) => {
      const category = exp.expense_categories?.name || "Other";
      const color = exp.expense_categories?.color || "#6B7280";
      const current = categoryMap.get(category) || { amount: 0, color };
      categoryMap.set(category, {
        amount: current.amount + Number(exp.amount),
        color,
      });
    });

    const categorySummary = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      color: data.color,
    }));

    // Daily trend for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });

    const dailyTrend = last7Days.map((date) => {
      const amount = expenses
        .filter((exp) => exp.date === date)
        .reduce((sum, exp) => sum + Number(exp.amount), 0);
      return { date, amount };
    });

    setStats({ totalExpenses, monthlyExpenses, categorySummary, dailyTrend });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categorySummary.length}</div>
            <p className="text-xs text-muted-foreground">Active categories</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Spending (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categorySummary}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.category}: $${entry.amount.toFixed(0)}`}
                >
                  {stats.categorySummary.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
