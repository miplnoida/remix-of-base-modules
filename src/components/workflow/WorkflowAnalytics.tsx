import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { CHART_COLORS, CHART_STYLES } from "@/lib/chartColors";

const executionData = [
  { name: "Mon", completed: 45, failed: 5, avgDuration: 125 },
  { name: "Tue", completed: 52, failed: 3, avgDuration: 118 },
  { name: "Wed", completed: 48, failed: 7, avgDuration: 132 },
  { name: "Thu", completed: 61, failed: 4, avgDuration: 115 },
  { name: "Fri", completed: 55, failed: 6, avgDuration: 128 },
  { name: "Sat", completed: 32, failed: 2, avgDuration: 120 },
  { name: "Sun", completed: 28, failed: 1, avgDuration: 110 },
];

const successRateData = [
  { name: "Retirement Benefits", value: 92, color: CHART_COLORS.primary },
  { name: "Sickness Claims", value: 88, color: CHART_COLORS.secondary },
  { name: "Employer Registration", value: 95, color: CHART_COLORS.accent },
  { name: "Compliance Audit", value: 78, color: CHART_COLORS.teal },
];

const bottleneckData = [
  { step: "Document Verification", avgTime: 245, sla: 180, deviation: 65 },
  { step: "Supervisor Approval", avgTime: 198, sla: 120, deviation: 78 },
  { step: "Medical Review", avgTime: 167, sla: 150, deviation: 17 },
  { step: "Financial Calculation", avgTime: 89, sla: 90, deviation: -1 },
  { step: "Final Approval", avgTime: 132, sla: 90, deviation: 42 },
];

export default function WorkflowAnalytics() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Workflow Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Performance insights and bottleneck identification
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">321</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">+12.5%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-secondary-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89.2%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">+2.1%</span> improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Executions</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">-8.7%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h 1m</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">-15m</span> faster
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Execution Trends (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={executionData}>
                <CartesianGrid {...CHART_STYLES.grid} />
                <XAxis dataKey="name" {...CHART_STYLES.axis} />
                <YAxis {...CHART_STYLES.axis} />
                <Tooltip {...CHART_STYLES.tooltip} />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke={CHART_COLORS.primary} strokeWidth={2} />
                <Line type="monotone" dataKey="failed" stroke={CHART_COLORS.error} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Success Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={successRateData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill={CHART_COLORS.primary}
                  dataKey="value"
                >
                  {successRateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Bottleneck Analysis</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Steps exceeding SLA with highest average duration
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bottleneckData}>
              <CartesianGrid {...CHART_STYLES.grid} />
              <XAxis dataKey="step" {...CHART_STYLES.axis} />
              <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} {...CHART_STYLES.axis} />
              <Tooltip {...CHART_STYLES.tooltip} />
              <Legend />
              <Bar dataKey="avgTime" fill={CHART_COLORS.error} name="Avg Time" />
              <Bar dataKey="sla" fill={CHART_COLORS.primary} name="SLA Target" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Average Duration by Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={executionData}>
              <CartesianGrid {...CHART_STYLES.grid} />
              <XAxis dataKey="name" {...CHART_STYLES.axis} />
              <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} {...CHART_STYLES.axis} />
              <Tooltip {...CHART_STYLES.tooltip} />
              <Legend />
              <Bar dataKey="avgDuration" fill={CHART_COLORS.secondary} name="Avg Duration (min)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
