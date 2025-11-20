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
import { Eye, FileText, Plus, Search, Filter } from 'lucide-react';
import { MOCK_CASES } from '@/services/mockData/complianceData';
import { CaseStatus, CaseType } from '@/types/compliance';
import { useNavigate } from 'react-router-dom';

export default function CaseManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredCases = MOCK_CASES.filter(c => {
    const matchesSearch = 
      c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.employerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.caseStatus === statusFilter;
    const matchesType = typeFilter === 'ALL' || c.caseType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: CaseStatus) => {
    const colors: Record<CaseStatus, string> = {
      [CaseStatus.OPEN]: 'bg-blue-100 text-blue-800',
      [CaseStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [CaseStatus.ON_HOLD]: 'bg-yellow-100 text-yellow-800',
      [CaseStatus.ARRANGEMENT_ACTIVE]: 'bg-purple-100 text-purple-800',
      [CaseStatus.ESCALATED_LEGAL]: 'bg-red-100 text-red-800',
      [CaseStatus.COMPLETED]: 'bg-teal-100 text-teal-800',
      [CaseStatus.CLOSED_NO_ACTION]: 'bg-gray-100 text-gray-800',
      [CaseStatus.CANCELLED]: 'bg-gray-100 text-gray-800',
      [CaseStatus.ARCHIVED]: 'bg-gray-100 text-gray-800',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return colors[priority];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatCaseType = (type: CaseType) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Case Management"
        subtitle="View and manage all compliance cases"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Case Management' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{MOCK_CASES.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {MOCK_CASES.filter(c => c.caseStatus === CaseStatus.ACTIVE).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Escalated to Legal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {MOCK_CASES.filter(c => c.caseStatus === CaseStatus.ESCALATED_LEGAL).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(MOCK_CASES.reduce((sum, c) => sum + c.outstandingBalance, 0))}
            </div>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case number or employer..."
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
                {Object.values(CaseStatus).map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {Object.values(CaseType).map(type => (
                  <SelectItem key={type} value={type}>{formatCaseType(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Cases ({filteredCases.length})</CardTitle>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Manual Case
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Number</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No cases found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCases.map((case_) => (
                  <TableRow key={case_.id}>
                    <TableCell className="font-medium">{case_.caseNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{case_.employerName}</div>
                        <div className="text-xs text-muted-foreground">{case_.employerZone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatCaseType(case_.caseType)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(case_.caseStatus)}>
                        {case_.caseStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs max-w-[150px] truncate" title={case_.caseStage}>
                        {case_.caseStage}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(case_.priority)}>
                        {case_.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(case_.outstandingBalance)}
                    </TableCell>
                    <TableCell>
                      {case_.assignedInspectorName || (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(case_.lastActivityDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/compliance/cases/${case_.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
