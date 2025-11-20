import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, Calendar, Download } from 'lucide-react';

const mockArrearsData = [
  { employer: 'ABC Manufacturing Ltd', zone: 'Zone A', totalArrears: 125000, age: '90+ days', lastPayment: '2024-08-15', trend: 'increasing' },
  { employer: 'XYZ Construction Co', zone: 'Zone B', totalArrears: 89000, age: '60-90 days', lastPayment: '2024-09-20', trend: 'stable' },
  { employer: 'Retail Mart Ltd', zone: 'Zone C', totalArrears: 67000, age: '30-60 days', lastPayment: '2024-10-05', trend: 'decreasing' },
  { employer: 'Hospitality Group', zone: 'Zone B', totalArrears: 156000, age: '90+ days', lastPayment: '2024-07-30', trend: 'increasing' },
  { employer: 'Transport Services', zone: 'Zone A', totalArrears: 45000, age: '30-60 days', lastPayment: '2024-10-12', trend: 'stable' },
];

const zoneArrearsData = [
  { zone: 'Zone A', arrears: 450000 },
  { zone: 'Zone B', arrears: 380000 },
  { zone: 'Zone C', arrears: 295000 },
];

const agingData = [
  { category: '0-30 days', amount: 185000, color: '#009B4C' },
  { category: '30-60 days', amount: 320000, color: '#F59E0B' },
  { category: '60-90 days', amount: 275000, color: '#F97316' },
  { category: '90+ days', amount: 345000, color: '#DC2626' },
];

const collectionsData = [
  { month: 'Jan', collected: 85000 },
  { month: 'Feb', collected: 92000 },
  { month: 'Mar', collected: 78000 },
  { month: 'Apr', collected: 105000 },
  { month: 'May', collected: 98000 },
  { month: 'Jun', collected: 112000 },
];

export default function ArrearsReports() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Arrears & Collections Reports"
        subtitle="Outstanding balances, payment trends, and recovery metrics"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'Arrears' }
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
              <label className="text-sm font-medium mb-2 block">Arrears Threshold</label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Amounts</SelectItem>
                  <SelectItem value="50k">Over EC$ 50K</SelectItem>
                  <SelectItem value="100k">Over EC$ 100K</SelectItem>
                  <SelectItem value="200k">Over EC$ 200K</SelectItem>
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
                <p className="text-sm text-muted-foreground">Total Arrears</p>
                <p className="text-2xl font-bold text-foreground">EC$ 1.13M</p>
                <p className="text-xs text-red-600">+EC$ 45K this month</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collections (MTD)</p>
                <p className="text-2xl font-bold text-foreground">EC$ 112K</p>
                <p className="text-xs text-green-600">+14% from last month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">90+ Days Overdue</p>
                <p className="text-2xl font-bold text-foreground">EC$ 345K</p>
                <p className="text-xs text-red-600">30.5% of total</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Days Overdue</p>
                <p className="text-2xl font-bold text-foreground">68</p>
                <p className="text-xs text-yellow-600">Industry avg: 52</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Arrears Aging Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="category" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="amount" fill="#009B4C">
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Collections Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={collectionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="collected" stroke="#009B4C" strokeWidth={3} name="Collections (EC$)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Top 50 Arrears Employers</CardTitle>
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
                <TableHead className="text-right">Total Arrears</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockArrearsData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.employer}</TableCell>
                  <TableCell>{row.zone}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    EC$ {(row.totalArrears / 1000).toFixed(0)}K
                  </TableCell>
                  <TableCell>
                    <span className={
                      row.age === '90+ days' ? 'text-red-600' :
                      row.age === '60-90 days' ? 'text-orange-600' : 'text-yellow-600'
                    }>
                      {row.age}
                    </span>
                  </TableCell>
                  <TableCell>{row.lastPayment}</TableCell>
                  <TableCell>
                    <span className={
                      row.trend === 'increasing' ? 'text-red-600' :
                      row.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
                    }>
                      {row.trend}
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
