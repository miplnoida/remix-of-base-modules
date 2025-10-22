import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  FileText, 
  DollarSign, 
  Search, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  Filter,
  Download,
  Plus,
  ArrowUp,
  ArrowDown,
  FileCheck,
  Scale,
  TrendingDown
} from "lucide-react";
import { useBemaDashboardStats } from "@/hooks/useBemaData";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const filingTrendData = [
  { month: 'Jul 24', filed: 245, expected: 300, compliance: 82 },
  { month: 'Aug 24', filed: 289, expected: 300, compliance: 96 },
  { month: 'Sep 24', filed: 267, expected: 300, compliance: 89 },
  { month: 'Oct 24', filed: 312, expected: 300, compliance: 104 },
  { month: 'Nov 24', filed: 298, expected: 300, compliance: 99 },
  { month: 'Dec 24', filed: 276, expected: 300, compliance: 92 },
  { month: 'Jan 25', filed: 295, expected: 300, compliance: 98 },
  { month: 'Feb 25', filed: 318, expected: 300, compliance: 106 },
  { month: 'Mar 25', filed: 302, expected: 300, compliance: 101 },
  { month: 'Apr 25', filed: 287, expected: 300, compliance: 96 },
  { month: 'May 25', filed: 310, expected: 300, compliance: 103 },
  { month: 'Jun 25', filed: 294, expected: 300, compliance: 98 },
];

const arrearsRecoveryData = [
  { month: 'Jan', recovered: 45000, outstanding: 120000, target: 50000 },
  { month: 'Feb', recovered: 52000, outstanding: 115000, target: 50000 },
  { month: 'Mar', recovered: 48000, outstanding: 118000, target: 50000 },
  { month: 'Apr', recovered: 67000, outstanding: 105000, target: 50000 },
  { month: 'May', recovered: 58000, outstanding: 98000, target: 50000 },
  { month: 'Jun', recovered: 72000, outstanding: 89000, target: 50000 },
];

const auditCoverageData = [
  { zone: 'Zone A', completed: 18, target: 20, percentage: 90 },
  { zone: 'Zone B', completed: 22, target: 25, percentage: 88 },
  { zone: 'Zone C', completed: 14, target: 15, percentage: 93 },
  { zone: 'Zone D', completed: 16, target: 20, percentage: 80 },
];

const inspectorLeaderboard = [
  { name: 'Maria Rodriguez', zone: 'A', cases: 28, recovered: 145000, rating: 98 },
  { name: 'Carlos Martinez', zone: 'B', cases: 32, recovered: 167000, rating: 96 },
  { name: 'Sarah Johnson', zone: 'C', cases: 24, recovered: 128000, rating: 94 },
  { name: 'David Chen', zone: 'D', cases: 30, recovered: 152000, rating: 95 },
  { name: 'Ana Silva', zone: 'A', cases: 26, recovered: 138000, rating: 93 },
];

export default function BemaDashboard() {
  const { data: stats, isLoading } = useBemaDashboardStats();
  const [dateRange, setDateRange] = useState("30");
  const [selectedZone, setSelectedZone] = useState("all");
  const [employerType, setEmployerType] = useState("all");

  const kpiCards = [
    {
      title: "C3 Filings Received",
      value: stats?.c3Filed || "294",
      change: "+8",
      trend: "up",
      percentage: "98%",
      subtitle: "Compliance Rate",
      icon: FileCheck,
      bgGradient: "from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
      onClick: () => toast.info("Opening C3 Filing module..."),
    },
    {
      title: "Arrears Outstanding",
      value: "$1.2M",
      change: "-$87K",
      trend: "down",
      percentage: "-6.8%",
      subtitle: "vs Last Month",
      icon: DollarSign,
      bgGradient: "from-amber-50 to-amber-100",
      iconColor: "text-amber-600",
      onClick: () => toast.info("Opening Arrears module..."),
    },
    {
      title: "Audits Due This Month",
      value: stats?.openAudits || "42",
      change: "+5",
      trend: "up",
      percentage: "15",
      subtitle: "Due This Week",
      icon: Search,
      bgGradient: "from-purple-50 to-purple-100",
      iconColor: "text-purple-600",
      onClick: () => toast.info("Opening Audits module..."),
    },
    {
      title: "Legal Referrals (YTD)",
      value: "18",
      change: "+3",
      trend: "up",
      percentage: "6",
      subtitle: "Active Cases",
      icon: Scale,
      bgGradient: "from-red-50 to-red-100",
      iconColor: "text-red-600",
      onClick: () => toast.info("Opening Legal module..."),
    },
    {
      title: "Recovery Rate",
      value: "67%",
      change: "+12%",
      trend: "up",
      percentage: "$72K",
      subtitle: "Collected MTD",
      icon: TrendingUp,
      bgGradient: "from-green-50 to-green-100",
      iconColor: "text-green-600",
      onClick: () => toast.info("Viewing recovery details..."),
    },
    {
      title: "Inspector Productivity",
      value: "94%",
      change: "+6%",
      trend: "up",
      percentage: "156",
      subtitle: "Field Visits MTD",
      icon: Users,
      bgGradient: "from-indigo-50 to-indigo-100",
      iconColor: "text-indigo-600",
      onClick: () => toast.info("Viewing inspector performance..."),
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">BeMA Compliance Dashboard</h1>
              <p className="text-blue-100">Real-time overview of compliance operations and performance</p>
            </div>
            
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  <SelectItem value="zone-a">Zone A</SelectItem>
                  <SelectItem value="zone-b">Zone B</SelectItem>
                  <SelectItem value="zone-c">Zone C</SelectItem>
                  <SelectItem value="zone-d">Zone D</SelectItem>
                </SelectContent>
              </Select>

              <Select value={employerType} onValueChange={setEmployerType}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employers</SelectItem>
                  <SelectItem value="large">Large (&gt;50)</SelectItem>
                  <SelectItem value="medium">Medium (10-50)</SelectItem>
                  <SelectItem value="small">Small (&lt;10)</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => toast.success("Generating dashboard report...")}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4">
          <Button 
            className="h-auto py-4 flex-col items-start bg-white hover:bg-gray-50 border shadow-sm"
            variant="outline"
            onClick={() => toast.info("Opening case creation...")}
          >
            <Plus className="h-5 w-5 mb-2 text-blue-600" />
            <span className="font-semibold text-foreground">Create Case</span>
            <span className="text-xs text-muted-foreground">New audit/arrears case</span>
          </Button>
          
          <Button 
            className="h-auto py-4 flex-col items-start bg-white hover:bg-gray-50 border shadow-sm"
            variant="outline"
            onClick={() => toast.info("Generating report...")}
          >
            <FileText className="h-5 w-5 mb-2 text-purple-600" />
            <span className="font-semibold text-foreground">Generate Report</span>
            <span className="text-xs text-muted-foreground">Custom analytics</span>
          </Button>
          
          <Button 
            className="h-auto py-4 flex-col items-start bg-white hover:bg-gray-50 border shadow-sm"
            variant="outline"
            onClick={() => toast.info("Opening workplan...")}
          >
            <Calendar className="h-5 w-5 mb-2 text-green-600" />
            <span className="font-semibold text-foreground">Review Workplan</span>
            <span className="text-xs text-muted-foreground">Inspector schedules</span>
          </Button>
          
          <Button 
            className="h-auto py-4 flex-col items-start bg-white hover:bg-gray-50 border shadow-sm"
            variant="outline"
            onClick={() => toast.info("Opening arrears...")}
          >
            <DollarSign className="h-5 w-5 mb-2 text-amber-600" />
            <span className="font-semibold text-foreground">Open Arrears</span>
            <span className="text-xs text-muted-foreground">Manage outstanding</span>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))
          ) : (
            kpiCards.map((kpi, i) => (
              <Card 
                key={i} 
                className={`bg-gradient-to-br ${kpi.bgGradient} border-0 shadow-md hover:shadow-lg transition-all cursor-pointer`}
                onClick={kpi.onClick}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium text-gray-600 mb-1">
                        {kpi.title}
                      </CardTitle>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-gray-900">{kpi.value}</span>
                        <div className="flex items-center gap-1">
                          {kpi.trend === "up" ? (
                            <ArrowUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDown className="h-4 w-4 text-green-600" />
                          )}
                          <span className="text-sm font-semibold text-green-600">{kpi.change}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg bg-white/50 ${kpi.iconColor}`}>
                      <kpi.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{kpi.subtitle}</span>
                    <span className="font-semibold text-gray-900">{kpi.percentage}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Main Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* C3 Filing Trend */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>C3 Filing Trend (12 Months)</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toast.info("Drilling down into filing data...")}
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>Monthly submissions vs expected targets</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={filingTrendData}>
                  <defs>
                    <linearGradient id="filedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="filed" 
                    stroke="#3b82f6" 
                    fill="url(#filedGradient)" 
                    strokeWidth={2}
                    name="Filed"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expected" 
                    stroke="#9ca3af" 
                    strokeDasharray="5 5" 
                    name="Expected"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Arrears Recovery */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Arrears Recovery by Zone</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toast.info("Viewing recovery details...")}
                >
                  <DollarSign className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>Monthly recovery vs outstanding balance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={arrearsRecoveryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Legend />
                  <Bar dataKey="recovered" fill="#10b981" name="Recovered" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outstanding" fill="#f59e0b" name="Outstanding" radius={[4, 4, 0, 0]} />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#6b7280" 
                    strokeDasharray="5 5" 
                    name="Target"
                    dot={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Audit Coverage & Inspector Leaderboard */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Audit Coverage */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Audit Coverage % vs Target</CardTitle>
              <CardDescription>Zone-wise audit completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditCoverageData.map((zone, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{zone.zone}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {zone.completed}/{zone.target}
                        </span>
                        <Badge variant={zone.percentage >= 90 ? "default" : "secondary"}>
                          {zone.percentage}%
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          zone.percentage >= 90 
                            ? 'bg-green-500' 
                            : zone.percentage >= 80 
                            ? 'bg-blue-500' 
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${zone.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inspector Productivity Leaderboard */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Inspector Productivity Leaderboard</CardTitle>
              <CardDescription>Top performing inspectors this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inspectorLeaderboard.map((inspector, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => toast.info(`Viewing details for ${inspector.name}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{inspector.name}</p>
                        <p className="text-xs text-muted-foreground">Zone {inspector.zone} • {inspector.cases} cases</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">${(inspector.recovered / 1000).toFixed(0)}K</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Rating:</span>
                        <Badge variant="outline" className="text-xs">{inspector.rating}%</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zone-wise Compliance Heatmap & Alerts */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Zone Heatmap */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle>Zone-wise Compliance Heatmap</CardTitle>
              <CardDescription>Geographic distribution of compliance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {auditCoverageData.map((zone, i) => (
                  <div 
                    key={i} 
                    className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${
                      zone.percentage >= 90 
                        ? 'bg-green-50 border-green-200 hover:border-green-300' 
                        : zone.percentage >= 80 
                        ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                        : 'bg-amber-50 border-amber-200 hover:border-amber-300'
                    }`}
                    onClick={() => toast.info(`Opening ${zone.zone} details...`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-foreground">{zone.zone}</h4>
                      <MapPin className={`h-5 w-5 ${
                        zone.percentage >= 90 ? 'text-green-600' : 
                        zone.percentage >= 80 ? 'text-blue-600' : 
                        'text-amber-600'
                      }`} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Compliance</span>
                        <span className="font-bold text-foreground">{zone.percentage}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Completed</span>
                        <span className="font-semibold text-foreground">{zone.completed}/{zone.target}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Alerts */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Quick Alerts</CardTitle>
              <CardDescription>Actionable items requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div 
                  className="p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => toast.error("Opening critical cases...")}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Urgent</p>
                      <p className="text-xs text-muted-foreground">7 broken payment plans need escalation</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => toast.warning("Opening pending items...")}
                >
                  <div className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Due This Week</p>
                      <p className="text-xs text-muted-foreground">15 audits scheduled</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => toast.info("Opening queries...")}
                >
                  <div className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">C3 Queries</p>
                      <p className="text-xs text-muted-foreground">8 submissions need clarification</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => toast.success("Viewing active plans...")}
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Active Plans</p>
                      <p className="text-xs text-muted-foreground">43 payment plans on track</p>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => toast.info("Viewing recovery stats...")}
                >
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">MTD Recovery</p>
                      <p className="text-xs text-muted-foreground">$187K (+23% vs last month)</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
