import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ClipboardCheck, TrendingDown, AlertTriangle, CheckCircle, Download } from 'lucide-react';

const mockC3ComplianceData = [
  { employer: 'ABC Manufacturing Ltd', zone: 'Zone A', onTime: 10, late: 2, missing: 0, complianceRate: 83 },
  { employer: 'XYZ Construction Co', zone: 'Zone B', onTime: 8, late: 3, missing: 1, complianceRate: 67 },
  { employer: 'Tech Solutions Inc', zone: 'Zone A', onTime: 12, late: 0, missing: 0, complianceRate: 100 },
  { employer: 'Retail Mart Ltd', zone: 'Zone C', onTime: 9, late: 2, missing: 1, complianceRate: 75 },
  { employer: 'Hospitality Group', zone: 'Zone B', onTime: 7, late: 4, missing: 1, complianceRate: 58 },
];

const submissionTypeData = [
  { name: 'On-Time', value: 612, color: '#009B4C' },
  { name: 'Late', value: 158, color: '#F59E0B' },
  { name: 'Missing', value: 42, color: '#DC2626' },
];

const zoneComplianceData = [
  { zone: 'Zone A', onTime: 215, late: 38, missing: 10 },
  { zone: 'Zone B', onTime: 198, late: 52, missing: 18 },
  { zone: 'Zone C', onTime: 199, late: 68, missing: 14 },
];

export default function C3Compliance() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="C3 Compliance Reports"
        subtitle="C3 submission rates, timeliness, and employer compliance"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'C3 Compliance' }
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
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select defaultValue="last-12-months">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                  <SelectItem value="last-12-months">Last 12 Months</SelectItem>
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
              <label className="text-sm font-medium mb-2 block">Employer</label>
              <Input placeholder="Search employer..." />
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
                <p className="text-sm text-muted-foreground">On-Time Submissions</p>
                <p className="text-2xl font-bold text-foreground">612</p>
                <p className="text-xs text-green-600">75.4% compliance</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Late Submissions</p>
                <p className="text-2xl font-bold text-foreground">158</p>
                <p className="text-xs text-yellow-600">19.5% of total</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Missing C3s</p>
                <p className="text-2xl font-bold text-foreground">42</p>
                <p className="text-xs text-red-600">5.2% non-compliant</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Compliance</p>
                <p className="text-2xl font-bold text-foreground">75.4%</p>
                <p className="text-xs text-blue-600">Target: 85%</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Submission Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={submissionTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {submissionTypeData.map((entry, index) => (
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
            <CardTitle>Compliance by Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={zoneComplianceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="zone" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend />
                <Bar dataKey="onTime" fill="#009B4C" name="On-Time" />
                <Bar dataKey="late" fill="#F59E0B" name="Late" />
                <Bar dataKey="missing" fill="#DC2626" name="Missing" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Employer C3 Compliance Details</CardTitle>
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
                <TableHead className="text-right">On-Time</TableHead>
                <TableHead className="text-right">Late</TableHead>
                <TableHead className="text-right">Missing</TableHead>
                <TableHead className="text-right">Compliance Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockC3ComplianceData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.employer}</TableCell>
                  <TableCell>{row.zone}</TableCell>
                  <TableCell className="text-right text-green-600">{row.onTime}</TableCell>
                  <TableCell className="text-right text-yellow-600">{row.late}</TableCell>
                  <TableCell className="text-right text-red-600">{row.missing}</TableCell>
                  <TableCell className="text-right">
                    <span className={row.complianceRate >= 85 ? 'text-green-600 font-semibold' : 'text-foreground'}>
                      {row.complianceRate}%
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
