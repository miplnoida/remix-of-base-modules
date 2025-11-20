import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, CheckCircle, XCircle, TrendingUp, Download } from 'lucide-react';

const mockArrangementData = [
  { employer: 'ABC Manufacturing Ltd', zone: 'Zone A', totalDebt: 125000, installment: 10000, paid: 8, total: 15, status: 'Active', nextDue: '2024-12-01' },
  { employer: 'XYZ Construction Co', zone: 'Zone B', totalDebt: 89000, installment: 8000, paid: 4, total: 12, status: 'Defaulted', nextDue: '2024-11-15' },
  { employer: 'Retail Mart Ltd', zone: 'Zone C', totalDebt: 67000, installment: 5500, paid: 12, total: 12, status: 'Completed', nextDue: '-' },
  { employer: 'Hospitality Group', zone: 'Zone B', totalDebt: 156000, installment: 12000, paid: 6, total: 18, status: 'Active', nextDue: '2024-11-28' },
  { employer: 'Transport Services', zone: 'Zone A', totalDebt: 45000, installment: 4500, paid: 7, total: 10, status: 'Active', nextDue: '2024-12-05' },
];

const successRateData = [
  { month: 'Jan', completed: 8, defaulted: 2 },
  { month: 'Feb', completed: 10, defaulted: 3 },
  { month: 'Mar', completed: 12, defaulted: 1 },
  { month: 'Apr', completed: 9, defaulted: 4 },
  { month: 'May', completed: 11, defaulted: 2 },
  { month: 'Jun', completed: 13, defaulted: 2 },
];

const paymentTrendData = [
  { month: 'Jan', payments: 85000 },
  { month: 'Feb', payments: 92000 },
  { month: 'Mar', payments: 88000 },
  { month: 'Apr', payments: 95000 },
  { month: 'May', payments: 102000 },
  { month: 'Jun', payments: 108000 },
];

export default function ArrangementReports() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Payment Arrangement Reports"
        subtitle="Active arrangements, defaults, and compliance tracking"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'Arrangements' }
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
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
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
                <p className="text-sm text-muted-foreground">Active Arrangements</p>
                <p className="text-2xl font-bold text-foreground">28</p>
                <p className="text-xs text-blue-600">Total: EC$ 1.2M</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">63</p>
                <p className="text-xs text-green-600">Success rate: 82%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Defaulted</p>
                <p className="text-2xl font-bold text-foreground">14</p>
                <p className="text-xs text-red-600">18% default rate</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payments (MTD)</p>
                <p className="text-2xl font-bold text-foreground">EC$ 108K</p>
                <p className="text-xs text-green-600">+6% from last month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Arrangement Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={successRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#009B4C" name="Completed" />
                <Bar dataKey="defaulted" fill="#DC2626" name="Defaulted" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installment Payment Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={paymentTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="payments" stroke="#009B4C" strokeWidth={3} name="Payments (EC$)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Arrangement Details</CardTitle>
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
                <TableHead className="text-right">Total Debt</TableHead>
                <TableHead className="text-right">Installment</TableHead>
                <TableHead className="text-center">Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockArrangementData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.employer}</TableCell>
                  <TableCell>{row.zone}</TableCell>
                  <TableCell className="text-right">EC$ {(row.totalDebt / 1000).toFixed(0)}K</TableCell>
                  <TableCell className="text-right">EC$ {(row.installment / 1000).toFixed(1)}K</TableCell>
                  <TableCell className="text-center">{row.paid}/{row.total}</TableCell>
                  <TableCell>
                    <span className={
                      row.status === 'Active' ? 'text-blue-600' :
                      row.status === 'Completed' ? 'text-green-600' : 'text-red-600'
                    }>
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell>{row.nextDue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
