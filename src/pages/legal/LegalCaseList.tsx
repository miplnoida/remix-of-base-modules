import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalCases } from '@/hooks/useLegalCases';
import { useLegalAuth } from '@/contexts/LegalAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Search, Filter, ChevronDown, ChevronUp, ArrowLeft, Home, LogOut, FileText } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-[#111827] text-white border border-[#1f2937]',
  'Filed': 'bg-[#B45309] text-white border border-[#C2410C]',
  'Under Review': 'bg-[#B45309] text-white border border-[#C2410C]',
  'Hearing Scheduled': 'bg-[#0F766E] text-white border border-[#0D9488]',
  'Decision Pending': 'bg-[#B45309] text-white border border-[#C2410C]',
  'Order Issued': 'bg-[#6D28D9] text-white border border-[#7C3AED]',
  'Closed – Compliant': 'bg-[#166534] text-white border border-[#15803D]',
  'Closed – Non-Compliant': 'bg-[#B91C1C] text-white border border-[#DC2626]',
  'Resolved': 'bg-[#047857] text-white border border-[#059669]',
  'Completed': 'bg-[#047857] text-white border border-[#059669]',
  'Within SLA': 'bg-[#047857] text-white border border-[#059669]',
  'At Risk': 'bg-[#DC2626] text-white border border-[#B91C1C]',
  'Overdue': 'bg-[#B91C1C] text-white border border-[#DC2626]',
  'Medium': 'bg-[#B45309] text-white border border-[#C2410C]',
  'Low': 'bg-[#0F766E] text-white border border-[#0D9488]',
  'High': 'bg-[#B91C1C] text-white border border-[#DC2626]',
};

export default function LegalCaseList() {
  const navigate = useNavigate();
  const { signOut, hasAnyRole } = useLegalAuth();
  const [filters, setFilters] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('');
  
  const { data: cases, isLoading } = useLegalCases(filters);

  const canCreateCase = hasAnyRole(['Clerk', 'LegalOfficer', 'Supervisor', 'Admin']);

  const handleApplyFilters = () => {
    const newFilters: any = {};
    if (statusFilter) newFilters.status = [statusFilter];
    if (caseTypeFilter) newFilters.case_type = [caseTypeFilter];
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setCaseTypeFilter('');
    setFilters({});
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Main Menu
            </Button>
            <h1 className="text-3xl font-bold">Legal Cases</h1>
          </div>
          <div className="flex gap-2">
            {canCreateCase && (
              <Button onClick={() => navigate('/legal/cases/new')} className="gap-2">
                <Plus className="h-4 w-4" />
                New Case
              </Button>
            )}
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle>Search & Filter Cases</CardTitle>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-popover">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Filed">Filed</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Hearing Scheduled">Hearing Scheduled</SelectItem>
                        <SelectItem value="Decision Pending">Decision Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Case Type</label>
                    <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                      <SelectTrigger className="bg-popover">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Prosecution">Prosecution</SelectItem>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                        <SelectItem value="Appeal">Appeal</SelectItem>
                        <SelectItem value="Recovery">Recovery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={handleApplyFilters} className="flex-1">Apply Filters</Button>
                    <Button variant="outline" onClick={handleClearFilters}>Clear</Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Cases Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cases</CardTitle>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading cases...</div>
            ) : cases && cases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Filed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((legalCase) => (
                    <TableRow
                      key={legalCase.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/legal/cases/${legalCase.id}`)}
                    >
                      <TableCell className="font-medium">{legalCase.number}</TableCell>
                      <TableCell>{legalCase.title}</TableCell>
                      <TableCell>{legalCase.case_type}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[legalCase.status] || 'bg-gray-100 text-gray-800'}>
                          {legalCase.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={legalCase.priority === 'Urgent' ? 'destructive' : 'outline'}>
                          {legalCase.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{legalCase.stage}</TableCell>
                      <TableCell>
                        {legalCase.filed_at ? format(new Date(legalCase.filed_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No cases found</p>
                {canCreateCase && (
                  <Button onClick={() => navigate('/legal/cases/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Case
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
