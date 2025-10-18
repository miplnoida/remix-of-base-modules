import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  FileText, 
  DollarSign, 
  Search, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle 
} from "lucide-react";
import { useBemaDashboardStats } from "@/hooks/useBemaData";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

const filingTrendData = [
  { month: 'Jan', filed: 245, expected: 300 },
  { month: 'Feb', filed: 289, expected: 300 },
  { month: 'Mar', filed: 267, expected: 300 },
  { month: 'Apr', filed: 312, expected: 300 },
  { month: 'May', filed: 298, expected: 300 },
  { month: 'Jun', filed: 276, expected: 300 },
];

const arrearsRecoveryData = [
  { month: 'Jan', recovered: 45000, outstanding: 120000 },
  { month: 'Feb', recovered: 52000, outstanding: 115000 },
  { month: 'Mar', recovered: 48000, outstanding: 118000 },
  { month: 'Apr', recovered: 67000, outstanding: 105000 },
  { month: 'May', recovered: 58000, outstanding: 98000 },
  { month: 'Jun', recovered: 72000, outstanding: 89000 },
];

export default function BemaDashboard() {
  const { data: stats, isLoading } = useBemaDashboardStats();

  const kpiCards = [
    {
      title: "Active Employers",
      value: "1,284",
      change: "+12 this month",
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "C3 Filed (MTD)",
      value: stats?.c3Filed || "0",
      change: "98% compliance",
      icon: FileText,
      color: "text-green-600",
    },
    {
      title: "Total Arrears",
      value: `$${(stats?.totalArrears || 0).toLocaleString()}`,
      change: "-8% vs last month",
      icon: DollarSign,
      color: "text-red-600",
    },
    {
      title: "Open Audits",
      value: stats?.openAudits || "0",
      change: "15 due this week",
      icon: Search,
      color: "text-amber-600",
    },
    {
      title: "Pending Registrations",
      value: stats?.pendingRegistrations || "0",
      change: "Awaiting assignment",
      icon: Users,
      color: "text-purple-600",
    },
    {
      title: "Broken Plans",
      value: "7",
      change: "Require escalation",
      icon: AlertTriangle,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">BeMA Compliance Dashboard</h1>
        <p className="text-muted-foreground">Real-time overview of compliance activities</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          kpiCards.map((kpi, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.change}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts */}
      <Tabs defaultValue="filing">
        <TabsList>
          <TabsTrigger value="filing">C3 Filing Trend</TabsTrigger>
          <TabsTrigger value="arrears">Arrears Recovery</TabsTrigger>
          <TabsTrigger value="audits">Audit Completion</TabsTrigger>
        </TabsList>

        <TabsContent value="filing">
          <Card>
            <CardHeader>
              <CardTitle>C3 Filing Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filingTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="filed" stroke="#10b981" name="Filed" />
                  <Line type="monotone" dataKey="expected" stroke="#6b7280" name="Expected" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arrears">
          <Card>
            <CardHeader>
              <CardTitle>Arrears Recovery Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={arrearsRecoveryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="recovered" fill="#10b981" name="Recovered" />
                  <Bar dataKey="outstanding" fill="#ef4444" name="Outstanding" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits">
          <Card>
            <CardHeader>
              <CardTitle>Audit Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { inspector: "Zone A", completed: 12, target: 15, rate: 80 },
                  { inspector: "Zone B", completed: 18, target: 20, rate: 90 },
                  { inspector: "Zone C", completed: 9, target: 12, rate: 75 },
                ].map((zone, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{zone.inspector}</span>
                      <span className="text-sm text-muted-foreground">
                        {zone.completed}/{zone.target} ({zone.rate}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${zone.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions & Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="font-medium">Inspections Due This Week</h3>
              </div>
              <p className="text-sm text-muted-foreground">15 employers scheduled for inspection</p>
            </div>
            
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium">Payment Plans Active</h3>
              </div>
              <p className="text-sm text-muted-foreground">43 plans currently in progress</p>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium">Recovery This Month</h3>
              </div>
              <p className="text-sm text-muted-foreground">$187K recovered (+23% vs last month)</p>
            </div>

            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <h3 className="font-medium">C3 Queries Pending</h3>
              </div>
              <p className="text-sm text-muted-foreground">8 submissions awaiting clarification</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
