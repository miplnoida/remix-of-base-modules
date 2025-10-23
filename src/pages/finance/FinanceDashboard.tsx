import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Receipt, Clock, AlertCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const collectionData = [
  { month: "Jan", actual: 145000, target: 150000 },
  { month: "Feb", actual: 165000, target: 160000 },
  { month: "Mar", actual: 155000, target: 165000 },
  { month: "Apr", actual: 178000, target: 170000 },
  { month: "May", actual: 182000, target: 175000 },
  { month: "Jun", actual: 195000, target: 180000 },
];

const paymentMethodData = [
  { name: "Cash", value: 45, color: "hsl(var(--bema-primary))" },
  { name: "Cheque", value: 30, color: "hsl(var(--bema-success))" },
  { name: "EFT", value: 15, color: "hsl(var(--bema-accent))" },
  { name: "Card", value: 10, color: "hsl(var(--bema-warning))" },
];

const fundData = [
  { fund: "SS", amount: 125000 },
  { fund: "Levy", amount: 45000 },
  { fund: "PE", amount: 23000 },
  { fund: "Loan", amount: 15000 },
  { fund: "Rental", amount: 8000 },
];

export default function FinanceDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="bema-h1 mb-2" style={{ color: "hsl(var(--bema-text-primary))" }}>SSB Finance Dashboard</h1>
        <p className="bema-t1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Real-time financial overview and key performance indicators</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Daily Collections</p>
                <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>$32,450</h3>
                <p className="bema-t2 mt-1" style={{ color: "hsl(var(--bema-success))" }}>+12.5% vs yesterday</p>
              </div>
              <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--bema-secondary))" }}>
                <DollarSign className="h-6 w-6" style={{ color: "hsl(var(--bema-primary))" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Open Batches</p>
                <h3 className="bema-h2" style={{ color: "hsl(var(--bema-primary))" }}>8</h3>
                <p className="bema-t2 mt-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Across 3 offices</p>
              </div>
              <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--bema-secondary))" }}>
                <Receipt className="h-6 w-6" style={{ color: "hsl(var(--bema-primary))" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Pending Invoices</p>
                <h3 className="bema-h2" style={{ color: "hsl(var(--bema-accent))" }}>47</h3>
                <p className="bema-t2 mt-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>$125,800 outstanding</p>
              </div>
              <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--bema-secondary))" }}>
                <Clock className="h-6 w-6" style={{ color: "hsl(var(--bema-accent))" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bema-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="bema-t2 mb-1" style={{ color: "hsl(var(--bema-text-secondary))" }}>Overdue Amount</p>
                <h3 className="bema-h2" style={{ color: "hsl(var(--bema-warning))" }}>$18,950</h3>
                <p className="bema-t2 mt-1" style={{ color: "hsl(var(--bema-warning))" }}>Requires attention</p>
              </div>
              <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--bema-warning) / 0.1)" }}>
                <AlertCircle className="h-6 w-6" style={{ color: "hsl(var(--bema-warning))" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection Trend */}
        <Card className="bema-card">
          <CardHeader>
            <CardTitle className="bema-h2">Collection Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={collectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="hsl(var(--bema-primary))" strokeWidth={2} name="Actual" />
                <Line type="monotone" dataKey="target" stroke="hsl(var(--bema-text-tertiary))" strokeWidth={2} strokeDasharray="5 5" name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card className="bema-card">
          <CardHeader>
            <CardTitle className="bema-h2">Payment Method Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fund Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fund Category Breakdown */}
        <Card className="bema-card">
          <CardHeader>
            <CardTitle className="bema-h2">Fund Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fundData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fund" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="hsl(var(--bema-primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bema-card">
          <CardHeader>
            <CardTitle className="bema-h2">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: "RCP-2025-001", cashier: "John Smith", amount: 2500, time: "10:45 AM", status: "completed" },
                { id: "RCP-2025-002", cashier: "Mary Johnson", amount: 1800, time: "11:20 AM", status: "completed" },
                { id: "RCP-2025-003", cashier: "David Brown", amount: 3200, time: "11:45 AM", status: "pending" },
                { id: "RCP-2025-004", cashier: "Sarah Wilson", amount: 950, time: "12:10 PM", status: "completed" },
              ].map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--bema-secondary) / 0.3)" }}>
                  <div>
                    <p className="bema-t1 font-semibold" style={{ color: "hsl(var(--bema-text-primary))" }}>{txn.id}</p>
                    <p className="bema-t2" style={{ color: "hsl(var(--bema-text-secondary))" }}>{txn.cashier} • {txn.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="bema-t1 font-semibold" style={{ color: "hsl(var(--bema-primary))" }}>${txn.amount.toLocaleString()}</p>
                    <span className={txn.status === "completed" ? "bema-badge-success" : "bema-badge-warning"}>
                      {txn.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
