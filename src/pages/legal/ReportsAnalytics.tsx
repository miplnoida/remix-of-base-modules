import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart3, Calendar as CalendarIcon, Download, FileText, Filter, Gauge, LineChart, PieChart, Save, Send, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BarChart, Bar, LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import { BackNavigation } from '@/components/ui/back-navigation';
import { useToast } from '@/hooks/use-toast';

// Mock data for charts
const caseVolumeData = [
  { type: 'Employer Arrears', count: 45, target: 40 },
  { type: 'Contributor Dispute', count: 32, target: 30 },
  { type: 'Fraud', count: 18, target: 20 },
  { type: 'Appeal', count: 25, target: 25 },
  { type: 'Overpayment', count: 15, target: 15 },
];

const durationData = [
  { stage: 'Intake', avgDays: 5, sla: 7 },
  { stage: 'Investigation', avgDays: 30, sla: 45 },
  { stage: 'Hearing', avgDays: 90, sla: 120 },
  { stage: 'Judgment', avgDays: 15, sla: 14 },
  { stage: 'Enforcement', avgDays: 180, sla: 365 },
];

const outcomeData = [
  { type: 'Employer Arrears', settled: 20, judgment: 15, dismissed: 5, ongoing: 5 },
  { type: 'Contributor Dispute', settled: 12, judgment: 8, dismissed: 7, ongoing: 5 },
  { type: 'Fraud', settled: 5, judgment: 8, dismissed: 2, ongoing: 3 },
  { type: 'Appeal', settled: 10, judgment: 8, dismissed: 4, ongoing: 3 },
];

const penaltyData = [
  { month: 'Jan', assessed: 125000, collected: 98000 },
  { month: 'Feb', assessed: 142000, collected: 115000 },
  { month: 'Mar', assessed: 138000, collected: 120000 },
  { month: 'Apr', assessed: 155000, collected: 125000 },
  { month: 'May', assessed: 148000, collected: 132000 },
  { month: 'Jun', assessed: 162000, collected: 145000 },
];

const workloadData = [
  { officer: 'J. Smith', active: 12, closed: 8, pending: 4 },
  { officer: 'M. Johnson', active: 15, closed: 10, pending: 5 },
  { officer: 'K. Williams', active: 10, closed: 12, pending: 2 },
  { officer: 'R. Davis', active: 14, closed: 9, pending: 6 },
];

const agingData = [
  { bucket: '0-30 days', count: 25, amount: 125000 },
  { bucket: '31-60 days', count: 18, amount: 89000 },
  { bucket: '61-90 days', count: 12, amount: 156000 },
  { bucket: '91-180 days', count: 15, amount: 287000 },
  { bucket: '180+ days', count: 22, amount: 456000 },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function ReportsAnalytics() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    caseType: '',
    status: '',
    officer: '',
  });

  const dimensions = [
    'Date', 'Case Type', 'Status', 'Stage', 'Officer', 'Party Role', 'Outcome', 'Severity', 'Hearing Type'
  ];

  const measures = [
    'Count(Cases)', 'Avg(Duration)', '%SLA', 'Sum(Penalty Assessed)', 'Sum(Payments)', '#Hearings'
  ];

  const handleExport = (format: string) => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    });
  };

  const handleSchedule = () => {
    toast({
      title: "Schedule Report",
      description: "Report scheduling feature coming soon",
    });
  };

  const handleRunQuery = () => {
    toast({
      title: "Running Query",
      description: "Ad-hoc report is being generated...",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackNavigation to="/legal" label="Back to Legal Dashboard" />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Prebuilt KPIs and custom report builder for legal operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={handleSchedule}>
            <Send className="mr-2 h-4 w-4" />
            Schedule Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboards">
            <BarChart3 className="mr-2 h-4 w-4" />
            Prebuilt Dashboards
          </TabsTrigger>
          <TabsTrigger value="builder">
            <Filter className="mr-2 h-4 w-4" />
            Ad-hoc Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboards" className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">135</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-muted-foreground">-3% from target</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Penalties Assessed</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$870K</div>
                <p className="text-xs text-muted-foreground">YTD total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">82%</div>
                <p className="text-xs text-muted-foreground">$715K collected</p>
              </CardContent>
            </Card>
          </div>

          {/* Case Volume by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Case Volume by Type</CardTitle>
              <CardDescription>Comparison with targets</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={caseVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Actual" />
                  <Bar dataKey="target" fill="hsl(var(--chart-2))" name="Target" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Duration by Stage */}
            <Card>
              <CardHeader>
                <CardTitle>Duration by Stage</CardTitle>
                <CardDescription>Average days vs SLA</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={durationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgDays" fill="hsl(var(--primary))" name="Avg Days" />
                    <Bar dataKey="sla" fill="hsl(var(--chart-3))" name="SLA" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Workload by Officer */}
            <Card>
              <CardHeader>
                <CardTitle>Workload by Officer</CardTitle>
                <CardDescription>Active, closed, and pending cases</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workloadData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="officer" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="active" fill="hsl(var(--primary))" name="Active" stackId="a" />
                    <Bar dataKey="pending" fill="hsl(var(--chart-2))" name="Pending" stackId="a" />
                    <Bar dataKey="closed" fill="hsl(var(--chart-3))" name="Closed" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Penalties Assessed vs Collected */}
          <Card>
            <CardHeader>
              <CardTitle>Penalties Assessed vs Collected</CardTitle>
              <CardDescription>Monthly trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLine data={penaltyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="assessed" stroke="hsl(var(--primary))" name="Assessed" />
                  <Line type="monotone" dataKey="collected" stroke="hsl(var(--chart-2))" name="Collected" />
                </RechartsLine>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Aging Buckets */}
          <Card>
            <CardHeader>
              <CardTitle>Aging Buckets</CardTitle>
              <CardDescription>Cases by age and outstanding amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age Bucket</TableHead>
                    <TableHead className="text-right">Case Count</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Avg per Case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingData.map((row) => (
                    <TableRow key={row.bucket}>
                      <TableCell className="font-medium">{row.bucket}</TableCell>
                      <TableCell className="text-right">{row.count}</TableCell>
                      <TableCell className="text-right">${row.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        ${Math.round(row.amount / row.count).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {agingData.reduce((sum, row) => sum + row.count, 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${agingData.reduce((sum, row) => sum + row.amount, 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ad-hoc Report Builder</CardTitle>
              <CardDescription>
                Build custom reports by selecting dimensions, measures, and filters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Dimensions */}
              <div className="space-y-3">
                <Label>Dimensions</Label>
                <div className="grid gap-2 md:grid-cols-3">
                  {dimensions.map((dim) => (
                    <div key={dim} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dim-${dim}`}
                        checked={selectedDimensions.includes(dim)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDimensions([...selectedDimensions, dim]);
                          } else {
                            setSelectedDimensions(selectedDimensions.filter((d) => d !== dim));
                          }
                        }}
                      />
                      <label
                        htmlFor={`dim-${dim}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {dim}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Measures */}
              <div className="space-y-3">
                <Label>Measures</Label>
                <div className="grid gap-2 md:grid-cols-3">
                  {measures.map((measure) => (
                    <div key={measure} className="flex items-center space-x-2">
                      <Checkbox
                        id={`measure-${measure}`}
                        checked={selectedMeasures.includes(measure)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMeasures([...selectedMeasures, measure]);
                          } else {
                            setSelectedMeasures(selectedMeasures.filter((m) => m !== measure));
                          }
                        }}
                      />
                      <label
                        htmlFor={`measure-${measure}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {measure}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-3">
                <Label>Filters</Label>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="filter-case-type">Case Type</Label>
                    <Select
                      value={filters.caseType}
                      onValueChange={(value) => setFilters({ ...filters, caseType: value })}
                    >
                      <SelectTrigger id="filter-case-type">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="arrears">Employer Arrears</SelectItem>
                        <SelectItem value="dispute">Contributor Dispute</SelectItem>
                        <SelectItem value="fraud">Fraud</SelectItem>
                        <SelectItem value="appeal">Appeal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-status">Status</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters({ ...filters, status: value })}
                    >
                      <SelectTrigger id="filter-status">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="filed">Filed</SelectItem>
                        <SelectItem value="progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter-officer">Assigned Officer</Label>
                    <Select
                      value={filters.officer}
                      onValueChange={(value) => setFilters({ ...filters, officer: value })}
                    >
                      <SelectTrigger id="filter-officer">
                        <SelectValue placeholder="All officers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Officers</SelectItem>
                        <SelectItem value="smith">J. Smith</SelectItem>
                        <SelectItem value="johnson">M. Johnson</SelectItem>
                        <SelectItem value="williams">K. Williams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleRunQuery} className="flex-1">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Run Query
                </Button>
                <Button variant="outline" onClick={() => {
                  toast({
                    title: "Query Saved",
                    description: "Your custom report has been saved",
                  });
                }}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Query
                </Button>
              </div>

              {/* Preview Results */}
              {(selectedDimensions.length > 0 || selectedMeasures.length > 0) && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="font-semibold mb-2">Query Preview</h3>
                  <div className="space-y-1 text-sm">
                    {selectedDimensions.length > 0 && (
                      <p>
                        <span className="font-medium">Dimensions:</span>{' '}
                        {selectedDimensions.join(', ')}
                      </p>
                    )}
                    {selectedMeasures.length > 0 && (
                      <p>
                        <span className="font-medium">Measures:</span>{' '}
                        {selectedMeasures.join(', ')}
                      </p>
                    )}
                    {(dateFrom || dateTo) && (
                      <p>
                        <span className="font-medium">Date Range:</span>{' '}
                        {dateFrom && format(dateFrom, 'PPP')} - {dateTo && format(dateTo, 'PPP')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
