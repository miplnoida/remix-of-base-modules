import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, CheckCircle, AlertTriangle, TrendingUp, Download } from 'lucide-react';

const mockAuditData = [
  { employer: 'ABC Manufacturing Ltd', zone: 'Zone A', auditDate: '2024-10-15', findings: 3, severity: 'Medium', status: 'Resolved' },
  { employer: 'XYZ Construction Co', zone: 'Zone B', auditDate: '2024-10-20', findings: 5, severity: 'High', status: 'In Progress' },
  { employer: 'Tech Solutions Inc', zone: 'Zone A', auditDate: '2024-11-01', findings: 0, severity: 'None', status: 'Compliant' },
  { employer: 'Retail Mart Ltd', zone: 'Zone C', auditDate: '2024-10-28', findings: 2, severity: 'Low', status: 'Resolved' },
  { employer: 'Hospitality Group', zone: 'Zone B', auditDate: '2024-11-05', findings: 7, severity: 'High', status: 'Open' },
];

const findingsSeverityData = [
  { name: 'High', value: 45, color: '#DC2626' },
  { name: 'Medium', value: 78, color: '#F59E0B' },
  { name: 'Low', value: 112, color: '#009B4C' },
  { name: 'None', value: 65, color: '#0EA5E9' },
];

const zoneCoverageData = [
  { zone: 'Zone A', audits: 42, target: 50 },
  { zone: 'Zone B', audits: 38, target: 45 },
  { zone: 'Zone C', audits: 35, target: 40 },
];

export default function AuditReports() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Audit & Inspection Reports"
        subtitle="Audit findings, inspection results, and risk assessments"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'Audit Reports' }
        ]}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select defaultValue="last-quarter">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="current-year">Current Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Zone</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  <SelectItem value="zone-a">Zone A</SelectItem>
                  <SelectItem value="zone-b">Zone B</SelectItem>
                  <SelectItem value="zone-c">Zone C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">Apply Filters</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Audits Completed</p>
                <p className="text-2xl font-bold text-foreground">115</p>
                <p className="text-xs text-green-600">85% of target</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Findings</p>
                <p className="text-2xl font-bold text-foreground">235</p>
                <p className="text-xs text-yellow-600">2.04 avg per audit</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Severity</p>
                <p className="text-2xl font-bold text-foreground">45</p>
                <p className="text-xs text-red-600">19% of findings</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
                <p className="text-2xl font-bold text-foreground">78%</p>
                <p className="text-xs text-green-600">+5% this quarter</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Findings by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={findingsSeverityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {findingsSeverityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Coverage by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={zoneCoverageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend />
                <Bar dataKey="audits" fill="#009B4C" name="Completed" />
                <Bar dataKey="target" fill="#CBD5E1" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Audit Results</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employer</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Audit Date</TableHead>
                <TableHead className="text-right">Findings</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAuditData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.employer}</TableCell>
                  <TableCell>{row.zone}</TableCell>
                  <TableCell>{row.auditDate}</TableCell>
                  <TableCell className="text-right">{row.findings}</TableCell>
                  <TableCell>
                    <span className={
                      row.severity === 'High' ? 'text-red-600 font-semibold' :
                      row.severity === 'Medium' ? 'text-yellow-600' :
                      row.severity === 'Low' ? 'text-blue-600' : 'text-green-600'
                    }>
                      {row.severity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={
                      row.status === 'Resolved' || row.status === 'Compliant' ? 'text-green-600' :
                      row.status === 'Open' ? 'text-red-600' : 'text-yellow-600'
                    }>
                      {row.status}
                    </span>
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
