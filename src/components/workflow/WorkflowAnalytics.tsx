import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

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
  { name: "Retirement Benefits", value: 92, color: "#22c55e" },
  { name: "Sickness Claims", value: 88, color: "#3b82f6" },
  { name: "Employer Registration", value: 95, color: "#a855f7" },
  { name: "Compliance Audit", value: 78, color: "#f59e0b" },
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
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">321</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89.2%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">+2.1%</span> improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Executions</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">-8.7%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h 1m</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">-15m</span> faster
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} />
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
                  fill="#8884d8"
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
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle>Bottleneck Analysis</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Steps exceeding SLA with highest average duration
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bottleneckData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" />
              <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgTime" fill="#ef4444" name="Avg Time" />
              <Bar dataKey="sla" fill="#22c55e" name="SLA Target" />
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: "Minutes", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgDuration" fill="#3b82f6" name="Avg Duration (min)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
