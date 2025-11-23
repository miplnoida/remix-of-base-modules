import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Scale, FileText, Gavel, DollarSign, Calendar, TrendingUp } from "lucide-react";

const casesByStageData = [
  { stage: "Filed", count: 12, amount: 450000 },
  { stage: "Judgment", count: 8, amount: 320000 },
  { stage: "Enforcement", count: 5, amount: 180000 },
  { stage: "Closed", count: 15, amount: 0 }
];

const recoveryData = [
  { month: "Jul", ordered: 85000, recovered: 45000 },
  { month: "Aug", ordered: 95000, recovered: 52000 },
  { month: "Sep", ordered: 120000, recovered: 68000 },
  { month: "Oct", ordered: 110000, recovered: 75000 },
  { month: "Nov", ordered: 98000, recovered: 62000 }
];

const territoryData = [
  { name: "St Kitts", value: 18, color: "#009B4C" },
  { name: "Nevis", value: 7, color: "#2563EB" }
];

const CHART_COLORS = {
  primary: "#009B4C",
  secondary: "#00713A",
  accent: "#2563EB",
  teal: "#0EA5E9",
  gold: "#F59E0B"
};

const LegalDashboard = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Dashboard"
        subtitle="Overview of all legal cases and enforcement actions"
        breadcrumbs={[
          { label: "Legal Management" }
        ]}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Legal Cases</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">40</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Judgments</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Obtained</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ordered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">EC$950K</div>
            <p className="text-xs text-muted-foreground">Court orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovered</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">EC$302K</div>
            <p className="text-xs text-muted-foreground">31.8% recovery rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Hearings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cases by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Cases by Legal Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={casesByStageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill={CHART_COLORS.primary} name="Number of Cases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cases by Territory */}
        <Card>
          <CardHeader>
            <CardTitle>Cases by Territory</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={territoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {territoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Recovery vs Court-Ordered Amounts</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={recoveryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ordered" fill={CHART_COLORS.accent} name="Ordered Amount" />
              <Bar dataKey="recovered" fill={CHART_COLORS.primary} name="Recovered Amount" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Court Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Number</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Order Type</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead className="text-right">Amount Ordered</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {casesByStageData.slice(0, 3).map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">SSB/LGL/00{idx + 1}/2024</TableCell>
                  <TableCell>Sample Party {idx + 1}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Judgment</Badge>
                  </TableCell>
                  <TableCell>2024-11-{10 + idx}</TableCell>
                  <TableCell className="text-right font-semibold">
                    EC${(item.amount / 1000).toFixed(0)}K
                  </TableCell>
                  <TableCell>
                    <Badge>Active</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalDashboard;
