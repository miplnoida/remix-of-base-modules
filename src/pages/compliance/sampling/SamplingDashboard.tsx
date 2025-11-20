import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, Eye, Download, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COLORS = ['#009B4C', '#2563EB', '#F59E0B', '#0EA5E9', '#EF4444'];

export default function SamplingDashboard() {
  // Selection by Type
  const selectionByType = [
    { name: 'Mandatory', value: 28, count: 28 },
    { name: 'Risk-Based', value: 15, count: 15 },
    { name: 'Pure Random', value: 7, count: 7 },
  ];

  // Selection by Zone
  const selectionByZone = [
    { zone: 'Zone 1 - Basseterre', mandatory: 12, risk: 6, random: 3 },
    { zone: 'Zone 2 - St. Peters', mandatory: 8, risk: 5, random: 2 },
    { zone: 'Zone 3 - Nevis', mandatory: 8, risk: 4, random: 2 }
  ];

  // Risk Band Distribution
  const riskBandData = [
    { band: 'High Risk', selected: 18, total: 45 },
    { band: 'Medium Risk', selected: 22, total: 120 },
    { band: 'Low Risk', selected: 10, total: 285 }
  ];

  // Historical Sampling Trend
  const historicalTrend = [
    { month: 'Jan', selected: 42 },
    { month: 'Feb', selected: 38 },
    { month: 'Mar', selected: 45 },
    { month: 'Apr', selected: 48 },
    { month: 'May', selected: 44 },
    { month: 'Jun', selected: 50 }
  ];

  // Recent Sampling Batches
  const samplingBatches = [
    { id: 'BATCH-2024-06', runDate: '2024-06-01 02:00', runBy: 'System (Auto)', employers: 50, mandatory: 28, risk: 15, random: 7, status: 'Completed' },
    { id: 'BATCH-2024-05', runDate: '2024-05-01 02:00', runBy: 'System (Auto)', employers: 44, mandatory: 25, risk: 13, random: 6, status: 'Completed' },
    { id: 'BATCH-2024-04', runDate: '2024-04-01 02:00', runBy: 'System (Auto)', employers: 48, mandatory: 27, risk: 14, random: 7, status: 'Completed' },
    { id: 'BATCH-2024-03', runDate: '2024-03-01 02:00', runBy: 'Admin User', employers: 45, mandatory: 26, risk: 12, random: 7, status: 'Completed' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Sampling Dashboard"
        subtitle="Manager overview of sampling runs and audit candidate selection"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Audit Planning', href: '/compliance/audit-planning' },
          { label: 'Sampling Dashboard' }
        ]}
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">50</div>
            <p className="text-xs text-muted-foreground mt-1">Employers selected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coverage %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">1.8%</div>
            <p className="text-xs text-muted-foreground mt-1">Of 2,750 active employers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mandatory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">28</div>
            <p className="text-xs text-muted-foreground mt-1">Must-audit employers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Run</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">Jun 1</div>
            <p className="text-xs text-muted-foreground mt-1">02:00 (Automatic)</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Viewing Period</CardTitle>
            <Select defaultValue="next">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next">Next Month (Jul 2024)</SelectItem>
                <SelectItem value="current">Current Month (Jun 2024)</SelectItem>
                <SelectItem value="last">Last Month (May 2024)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Selection by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={selectionByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (${entry.count})`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {selectionByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selection by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={selectionByZone}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="mandatory" stackId="a" fill="#F59E0B" name="Mandatory" />
                <Bar dataKey="risk" stackId="a" fill="#009B4C" name="Risk-Based" />
                <Bar dataKey="random" stackId="a" fill="#2563EB" name="Random" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Band Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskBandData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="band" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="selected" fill="#009B4C" name="Selected" />
                <Bar dataKey="total" fill="#CBD5E1" name="Total Available" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historical Sampling Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="selected" stroke="#009B4C" strokeWidth={2} name="Employers Selected" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sampling Batches Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Sampling Batches</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Run Date/Time</TableHead>
                <TableHead>Run By</TableHead>
                <TableHead>Total Selected</TableHead>
                <TableHead>Mandatory</TableHead>
                <TableHead>Risk-Based</TableHead>
                <TableHead>Random</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {samplingBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.id}</TableCell>
                  <TableCell>{batch.runDate}</TableCell>
                  <TableCell>{batch.runBy}</TableCell>
                  <TableCell className="font-semibold">{batch.employers}</TableCell>
                  <TableCell>{batch.mandatory}</TableCell>
                  <TableCell>{batch.risk}</TableCell>
                  <TableCell>{batch.random}</TableCell>
                  <TableCell>
                    <Badge variant="default">{batch.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
