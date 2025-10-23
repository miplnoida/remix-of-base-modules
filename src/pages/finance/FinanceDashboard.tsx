import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Users, FileText, CreditCard } from 'lucide-react';

const FinanceDashboard = () => {
  // KPI Data
  const kpiData = [
    { title: 'Daily Collections', value: 'XCD 125,450', change: '+12.5%', trend: 'up', icon: DollarSign, color: 'text-green-600' },
    { title: 'Open Batches', value: '8', change: '3 active', trend: 'neutral', icon: FileText, color: 'text-blue-600' },
    { title: 'Pending Invoices', value: '142', change: 'XCD 89,200', trend: 'down', icon: Clock, color: 'text-orange-600' },
    { title: 'Outstanding Balance', value: 'XCD 2.4M', change: '-5.2%', trend: 'up', icon: TrendingUp, color: 'text-purple-600' },
  ];

  // Monthly Collection Trend
  const collectionTrend = [
    { month: 'Jan', amount: 850000, target: 900000 },
    { month: 'Feb', amount: 920000, target: 900000 },
    { month: 'Mar', amount: 875000, target: 900000 },
    { month: 'Apr', amount: 950000, target: 900000 },
    { month: 'May', amount: 1020000, target: 900000 },
    { month: 'Jun', amount: 980000, target: 900000 },
  ];

  // Payment Method Distribution
  const paymentMethods = [
    { name: 'Cash', value: 45, amount: 56312 },
    { name: 'Check', value: 30, amount: 37541 },
    { name: 'Card', value: 20, amount: 25020 },
    { name: 'EFT', value: 5, amount: 6577 },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  // Fund Category Breakdown
  const fundBreakdown = [
    { category: 'Social Security', amount: 65000, percentage: 52 },
    { category: 'Levy', amount: 28000, percentage: 22 },
    { category: 'Employment Injury', amount: 18000, percentage: 14 },
    { category: 'Rentals', amount: 8450, percentage: 7 },
    { category: 'Loans', amount: 6000, percentage: 5 },
  ];

  // Recent Activity
  const recentActivity = [
    { id: 'RCPT-2891', cashier: 'Jane Doe', amount: 'XCD 4,250', time: '10:45 AM', status: 'completed' },
    { id: 'RCPT-2890', cashier: 'John Smith', amount: 'XCD 1,890', time: '10:32 AM', status: 'completed' },
    { id: 'RCPT-2889', cashier: 'Jane Doe', amount: 'XCD 3,120', time: '10:18 AM', status: 'completed' },
    { id: 'INV-0456', cashier: 'System', amount: 'XCD 850', time: '09:55 AM', status: 'pending' },
  ];

  // Batch Status
  const activeBatches = [
    { id: 'BATCH-2025-001', cashier: 'Jane Doe', opened: '08:00 AM', receipts: 24, amount: 'XCD 18,450' },
    { id: 'BATCH-2025-002', cashier: 'John Smith', opened: '08:15 AM', receipts: 18, amount: 'XCD 12,340' },
    { id: 'BATCH-2025-003', cashier: 'Mary Johnson', opened: '09:00 AM', receipts: 12, amount: 'XCD 8,760' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            SSB Finance Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Comprehensive financial operations and control center</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Export Report</Button>
          <Button className="bg-gradient-to-r from-primary to-primary/80">New Payment</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <h3 className="text-2xl font-bold mt-2">{kpi.value}</h3>
                  <p className={`text-sm mt-2 ${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {kpi.change}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-primary/10`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="batches">Active Batches</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Collection Trend */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Collection Trend (6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={collectionTrend}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#colorAmount)" name="Actual" />
                    <Area type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" fill="none" strokeDasharray="5 5" name="Target" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Method Distribution */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Methods (Today)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Fund Category Breakdown */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Fund Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fundBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="category" type="category" width={150} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${activity.status === 'completed' ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                        {activity.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{activity.id}</p>
                        <p className="text-sm text-muted-foreground">{activity.cashier}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{activity.amount}</p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Batches Tab */}
        <TabsContent value="batches" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Active Cashier Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeBatches.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between p-6 rounded-lg bg-muted/30 border border-border/50">
                    <div>
                      <h4 className="font-semibold text-lg">{batch.id}</h4>
                      <p className="text-sm text-muted-foreground mt-1">Cashier: {batch.cashier}</p>
                      <p className="text-sm text-muted-foreground">Opened: {batch.opened}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{batch.amount}</p>
                      <p className="text-sm text-muted-foreground mt-1">{batch.receipts} receipts</p>
                      <Button size="sm" variant="outline" className="mt-2">View Batch</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/50 bg-gradient-to-br from-orange-500/10 to-orange-500/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Invoices</p>
                    <h3 className="text-3xl font-bold mt-2">142</h3>
                    <p className="text-sm text-muted-foreground mt-2">XCD 89,200</p>
                  </div>
                  <Clock className="h-10 w-10 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Paid This Month</p>
                    <h3 className="text-3xl font-bold mt-2">348</h3>
                    <p className="text-sm text-muted-foreground mt-2">XCD 215,680</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-gradient-to-br from-red-500/10 to-red-500/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <h3 className="text-3xl font-bold mt-2">28</h3>
                    <p className="text-sm text-muted-foreground mt-2">XCD 24,560</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Detailed analytics and insights coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinanceDashboard;
