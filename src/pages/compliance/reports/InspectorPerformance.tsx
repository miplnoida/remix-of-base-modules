import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, CheckCircle, AlertCircle, Download } from 'lucide-react';

const mockPerformanceData = [
  { inspector: 'John Smith', zone: 'Zone A', plansSubmitted: 12, plansApproved: 11, fieldVisits: 48, casesHandled: 15, complianceRate: 92 },
  { inspector: 'Mary Johnson', zone: 'Zone B', plansSubmitted: 12, plansApproved: 12, fieldVisits: 52, casesHandled: 18, complianceRate: 100 },
  { inspector: 'Robert Brown', zone: 'Zone A', plansSubmitted: 11, plansApproved: 10, fieldVisits: 44, casesHandled: 12, complianceRate: 91 },
  { inspector: 'Sarah Davis', zone: 'Zone C', plansSubmitted: 12, plansApproved: 11, fieldVisits: 50, casesHandled: 16, complianceRate: 92 },
  { inspector: 'Michael Wilson', zone: 'Zone B', plansSubmitted: 10, plansApproved: 9, fieldVisits: 38, casesHandled: 10, complianceRate: 90 },
];

const monthlyTrendData = [
  { month: 'Jan', visits: 180, cases: 48, plans: 45 },
  { month: 'Feb', visits: 195, cases: 52, plans: 47 },
  { month: 'Mar', visits: 210, cases: 56, plans: 48 },
  { month: 'Apr', visits: 205, cases: 54, plans: 46 },
  { month: 'May', visits: 220, cases: 58, plans: 49 },
  { month: 'Jun', visits: 232, cases: 61, plans: 50 },
];

export default function InspectorPerformance() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Inspector Performance Reports"
        subtitle="Field activity, plan compliance, and productivity metrics"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'Inspector Performance' }
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
              <Select defaultValue="last-6-months">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                  <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
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
              <label className="text-sm font-medium mb-2 block">Inspector</label>
              <Input placeholder="Search inspector..." />
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
                <p className="text-sm text-muted-foreground">Total Field Visits</p>
                <p className="text-2xl font-bold text-foreground">232</p>
                <p className="text-xs text-green-600">+8% from last month</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plan Approval Rate</p>
                <p className="text-2xl font-bold text-foreground">94%</p>
                <p className="text-xs text-green-600">+2% improvement</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cases Handled</p>
                <p className="text-2xl font-bold text-foreground">61</p>
                <p className="text-xs text-green-600">+5 new cases</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Compliance Rate</p>
                <p className="text-2xl font-bold text-foreground">93%</p>
                <p className="text-xs text-yellow-600">Stable</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Activity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="visits" stroke="#009B4C" strokeWidth={2} name="Field Visits" />
              <Line type="monotone" dataKey="cases" stroke="#2563EB" strokeWidth={2} name="Cases Handled" />
              <Line type="monotone" dataKey="plans" stroke="#0EA5E9" strokeWidth={2} name="Plans Approved" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inspector Performance Details</CardTitle>
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
                <TableHead>Inspector</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead className="text-right">Plans Submitted</TableHead>
                <TableHead className="text-right">Plans Approved</TableHead>
                <TableHead className="text-right">Field Visits</TableHead>
                <TableHead className="text-right">Cases Handled</TableHead>
                <TableHead className="text-right">Compliance Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPerformanceData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{row.inspector}</TableCell>
                  <TableCell>{row.zone}</TableCell>
                  <TableCell className="text-right">{row.plansSubmitted}</TableCell>
                  <TableCell className="text-right">{row.plansApproved}</TableCell>
                  <TableCell className="text-right">{row.fieldVisits}</TableCell>
                  <TableCell className="text-right">{row.casesHandled}</TableCell>
                  <TableCell className="text-right">
                    <span className={row.complianceRate >= 95 ? 'text-green-600 font-semibold' : 'text-foreground'}>
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
