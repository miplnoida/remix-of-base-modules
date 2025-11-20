import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Scale, FileText, TrendingUp, Download } from 'lucide-react';

const mockLegalData = [
  { employer: 'ABC Manufacturing Ltd', zone: 'Zone A', escalationDate: '2024-08-15', stage: 'Court Proceedings', arrears: 125000, status: 'Active' },
  { employer: 'XYZ Construction Co', zone: 'Zone B', escalationDate: '2024-09-20', stage: 'Legal Notice Issued', arrears: 89000, status: 'Active' },
  { employer: 'Hospitality Group', zone: 'Zone B', escalationDate: '2024-07-30', stage: 'Judgment Received', arrears: 156000, status: 'Enforcement' },
  { employer: 'Retail Services Ltd', zone: 'Zone C', escalationDate: '2024-10-05', stage: 'Summons Prepared', arrears: 67000, status: 'Active' },
  { employer: 'Transport Co', zone: 'Zone A', escalationDate: '2024-08-22', stage: 'Legal Review', arrears: 45000, status: 'Pending' },
];

const stageDistributionData = [
  { name: 'Legal Review', value: 12, color: '#F59E0B' },
  { name: 'Notice Issued', value: 18, color: '#2563EB' },
  { name: 'Summons Prepared', value: 15, color: '#0EA5E9' },
  { name: 'Court Proceedings', value: 22, color: '#DC2626' },
  { name: 'Judgment Received', value: 8, color: '#00713A' },
  { name: 'Enforcement', value: 5, color: '#009B4C' },
];

const monthlyEscalationData = [
  { month: 'Jan', escalated: 5 },
  { month: 'Feb', escalated: 7 },
  { month: 'Mar', escalated: 6 },
  { month: 'Apr', escalated: 9 },
  { month: 'May', escalated: 8 },
  { month: 'Jun', escalated: 11 },
];

export default function LegalEscalationReports() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Legal Escalation Reports"
        subtitle="Cases escalated to legal, court proceedings, and outcomes"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'Legal Escalation' }
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
              <Select defaultValue="current-year">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="last-6-months">Last 6 Months</SelectItem>
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
              <label className="text-sm font-medium mb-2 block">Legal Stage</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="review">Legal Review</SelectItem>
                  <SelectItem value="notice">Notice Issued</SelectItem>
                  <SelectItem value="court">Court Proceedings</SelectItem>
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
                <p className="text-sm text-muted-foreground">Cases in Legal</p>
                <p className="text-2xl font-bold text-foreground">80</p>
                <p className="text-xs text-red-600">12% of total cases</p>
              </div>
              <Scale className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Escalated This Month</p>
                <p className="text-2xl font-bold text-foreground">11</p>
                <p className="text-xs text-yellow-600">+37% from last month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Court Proceedings</p>
                <p className="text-2xl font-bold text-foreground">22</p>
                <p className="text-xs text-orange-600">27.5% of legal cases</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Arrears</p>
                <p className="text-2xl font-bold text-foreground">EC$ 2.4M</p>
                <p className="text-xs text-red-600">In legal cases</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Legal Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stageDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stageDistributionData.map((entry, index) => (
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
            <CardTitle>Monthly Escalation Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyEscalationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend />
                <Bar dataKey="escalated" fill="#DC2626" name="Escalated Cases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Legal Cases Details</CardTitle>
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
                <TableHead>Escalation Date</TableHead>
                <TableHead>Legal Stage</TableHead>
                <TableHead className="text-right">Arrears</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockLegalData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.employer}</TableCell>
                  <TableCell>{row.zone}</TableCell>
                  <TableCell>{row.escalationDate}</TableCell>
                  <TableCell>{row.stage}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    EC$ {(row.arrears / 1000).toFixed(0)}K
                  </TableCell>
                  <TableCell>
                    <span className={
                      row.status === 'Active' ? 'text-orange-600' :
                      row.status === 'Enforcement' ? 'text-red-600' : 'text-yellow-600'
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
