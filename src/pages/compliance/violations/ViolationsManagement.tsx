import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Plus, Search, Filter, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchViolations } from '@/services/complianceDataService';

const VIOLATION_STATUSES = ['OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'CANCELLED'];
const VIOLATION_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export default function ViolationsManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [monthFilter, setMonthFilter] = useState<string>(currentMonth);

  const { data: violations = [], isLoading } = useQuery({
    queryKey: ['ce_violations', statusFilter, priorityFilter, searchTerm, monthFilter],
    queryFn: () => fetchViolations({
      status: statusFilter,
      priority: priorityFilter,
      search: searchTerm || undefined,
      month: monthFilter || undefined,
    }),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-primary/10 text-primary',
      UNDER_REVIEW: 'bg-warning/10 text-warning',
      IN_PROGRESS: 'bg-accent/10 text-accent-foreground',
      ESCALATED: 'bg-destructive/10 text-destructive',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-muted text-muted-foreground',
      CANCELLED: 'bg-muted text-muted-foreground',
    };
    return colors[status] ?? 'bg-muted text-muted-foreground';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      Critical: 'bg-destructive/10 text-destructive',
      High: 'bg-orange-100 text-orange-800',
      Medium: 'bg-warning/10 text-warning',
      Low: 'bg-muted text-muted-foreground',
    };
    return colors[priority] ?? 'bg-muted text-muted-foreground';
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const openCount = violations.filter((v: any) => v.status === 'OPEN').length;
  const escalatedCount = violations.filter((v: any) => v.status === 'ESCALATED').length;
  const reviewCount = violations.filter((v: any) => v.status === 'UNDER_REVIEW').length;
  const totalOutstanding = violations.reduce((sum: number, v: any) => sum + (Number(v.total_amount) || 0), 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Violations Management"
        subtitle="View and manage all compliance violations"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Violations Management' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{violations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{openCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{reviewCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Escalated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{escalatedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by number, employer, or summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {VIOLATION_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                {VIOLATION_PRIORITIES.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full"
              />
              {monthFilter && (
                <Button variant="link" size="sm" className="px-0 h-6 text-xs" onClick={() => setMonthFilter('')}>
                  Show all months
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Violations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Violations ({violations.length})</CardTitle>
          <Button size="sm" onClick={() => navigate('/compliance/violations/manual-entry')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Manual Violation
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Violation #</TableHead>
                  <TableHead className="min-w-[200px]">Employer</TableHead>
                  <TableHead className="min-w-[150px]">Type</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[90px]">Priority</TableHead>
                  <TableHead className="min-w-[90px]">Period</TableHead>
                  <TableHead className="min-w-[110px]">Amount</TableHead>
                  <TableHead className="min-w-[130px]">Assigned To</TableHead>
                  <TableHead className="min-w-[110px]">Discovered</TableHead>
                  <TableHead className="min-w-[80px] sticky right-0 bg-background">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No violations found
                    </TableCell>
                  </TableRow>
                ) : (
                  violations.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium font-mono text-xs">{v.violation_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{v.employer_name ?? 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{v.employer_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{v.ce_violation_types?.name ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">{v.ce_violation_types?.category}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(v.status)}>
                          {v.status?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(v.priority)}>
                          {v.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{v.period_from ?? '-'}</TableCell>
                      <TableCell className="font-medium">
                        {v.total_amount ? formatCurrency(Number(v.total_amount)) : '-'}
                      </TableCell>
                      <TableCell>
                        {v.assigned_to_name || (
                          <span className="text-muted-foreground text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.discovered_date ? new Date(v.discovered_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-background">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/compliance/violations/${v.id}`)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
