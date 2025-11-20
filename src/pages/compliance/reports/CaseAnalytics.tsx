import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MOCK_CASES } from '@/services/mockData/complianceData';
import { CaseStatus, CaseType } from '@/types/compliance';

const COLORS = ['#009B4C', '#2563EB', '#0EA5E9', '#F59E0B', '#EF4444'];

export default function CaseAnalytics() {
  // Cases by Status
  const casesByStatus = Object.values(CaseStatus).map(status => ({
    status: status.replace(/_/g, ' '),
    count: MOCK_CASES.filter(c => c.caseStatus === status).length
  }));

  // Cases by Type
  const casesByType = Object.values(CaseType).map(type => ({
    type: type.replace(/_/g, ' '),
    count: MOCK_CASES.filter(c => c.caseType === type).length,
    value: MOCK_CASES.filter(c => c.caseType === type).length
  }));

  // Cases by Zone
  const casesByZone = [
    { zone: 'Zone 1 - Basseterre', cases: 15, resolved: 8 },
    { zone: 'Zone 2 - St. Peters', cases: 12, resolved: 6 },
    { zone: 'Zone 3 - Nevis', cases: 18, resolved: 10 }
  ];

  // Monthly Trend
  const monthlyTrend = [
    { month: 'Jan', created: 8, closed: 5 },
    { month: 'Feb', created: 12, closed: 7 },
    { month: 'Mar', created: 10, closed: 9 },
    { month: 'Apr', created: 15, closed: 11 },
    { month: 'May', created: 14, closed: 13 },
    { month: 'Jun', created: 11, closed: 8 }
  ];

  // Average Resolution Time by Type
  const resolutionTime = [
    { type: 'Late C3', avgDays: 45 },
    { type: 'Not Submitted', avgDays: 62 },
    { type: 'No Payment', avgDays: 38 },
    { type: 'Arrears', avgDays: 75 },
    { type: 'Validation Error', avgDays: 28 }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Case Analytics Report"
        subtitle="Comprehensive case management statistics and trends"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'Case Analytics' }
        ]}
      />

      {/* KPI Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{MOCK_CASES.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {MOCK_CASES.filter(c => c.caseStatus === CaseStatus.ACTIVE).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently open</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {MOCK_CASES.filter(c => c.caseStatus === CaseStatus.COMPLETED).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month: 8</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">52</div>
            <p className="text-xs text-muted-foreground mt-1">Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cases by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={casesByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#009B4C" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cases by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={casesByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.type.substring(0, 15)}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {casesByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Case Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#009B4C" strokeWidth={2} name="Created" />
                <Line type="monotone" dataKey="closed" stroke="#2563EB" strokeWidth={2} name="Closed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cases by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={casesByZone}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cases" fill="#009B4C" name="Total Cases" />
                <Bar dataKey="resolved" fill="#2563EB" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Time Table */}
      <Card>
        <CardHeader>
          <CardTitle>Average Resolution Time by Case Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Type</TableHead>
                <TableHead>Average Days to Resolve</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolutionTime.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.type}</TableCell>
                  <TableCell>{item.avgDays} days</TableCell>
                  <TableCell>
                    <Badge variant={item.avgDays < 45 ? 'default' : item.avgDays < 60 ? 'secondary' : 'destructive'}>
                      {item.avgDays < 45 ? 'Good' : item.avgDays < 60 ? 'Moderate' : 'Needs Improvement'}
                    </Badge>
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
