import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalCases } from '@/hooks/useLegalCases';
import { useLegalAuth } from '@/contexts/LegalAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Search, Filter, ChevronDown, Home, LogOut, Eye, Edit, Trash2, Download, Columns } from 'lucide-react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const getStatusBadgeClass = (status: string) => {
  const statusMap: Record<string, string> = {
    'Draft': 'bg-[#6B7280] text-white',
    'Filed': 'bg-[#B45309] text-white',
    'Under Review': 'bg-[#B45309] text-white',
    'Hearing Scheduled': 'bg-[#0F766E] text-white',
    'Decision Pending': 'bg-[#B45309] text-white',
    'Order Issued': 'bg-[#6D28D9] text-white',
    'Closed – Compliant': 'bg-[#166534] text-white',
    'Closed – Non-Compliant': 'bg-[#B91C1C] text-white',
    'Resolved': 'bg-[#047857] text-white',
    'Completed': 'bg-[#047857] text-white',
    'Pending': 'bg-[#B45309] text-white',
  };
  return statusMap[status] || 'bg-[#6B7280] text-white';
};

export default function LegalCaseList() {
  const navigate = useNavigate();
  const { signOut, hasAnyRole } = useLegalAuth();
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [caseNumber, setCaseNumber] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  
  const { data: cases, isLoading } = useLegalCases({});
  const canCreateCase = hasAnyRole(['Clerk', 'LegalOfficer', 'Supervisor', 'Admin']);

  // Filter and search logic
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    
    return cases.filter(c => {
      const matchesSearch = !searchTerm || 
        c.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCaseNumber = !caseNumber || c.number?.toLowerCase().includes(caseNumber.toLowerCase());
      const matchesTitle = !caseTitle || c.title?.toLowerCase().includes(caseTitle.toLowerCase());
      const matchesStatus = !statusFilter || statusFilter === 'all' || c.status === statusFilter;
      const matchesType = !caseTypeFilter || caseTypeFilter === 'all' || c.case_type === caseTypeFilter;
      const matchesPriority = !priorityFilter || priorityFilter === 'all' || c.priority === priorityFilter;
      
      return matchesSearch && matchesCaseNumber && matchesTitle && matchesStatus && matchesType && matchesPriority;
    });
  }, [cases, searchTerm, caseNumber, caseTitle, statusFilter, caseTypeFilter, priorityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCases.length / recordsPerPage);
  const paginatedCases = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredCases.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredCases, currentPage, recordsPerPage]);

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleReset = () => {
    setCaseNumber('');
    setCaseTitle('');
    setStatusFilter('');
    setCaseTypeFilter('');
    setPriorityFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Main Menu
            </Button>
            <h1 className="text-2xl font-bold">SSB Legal - Case Management</h1>
          </div>
          <div className="flex gap-2">
            {canCreateCase && (
              <Button onClick={() => navigate('/legal/cases/new')} className="gap-2 bg-[#2563EB] hover:bg-[#1D4ED8]">
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

        {/* Query By Filter Section */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <CardTitle className="text-lg">Query By</CardTitle>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <p className="text-sm text-muted-foreground mt-1">Filter and search Legal Cases</p>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Case Number</label>
                    <Input
                      placeholder="Enter Case Number"
                      value={caseNumber}
                      onChange={(e) => setCaseNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Case Title</label>
                    <Input
                      placeholder="Enter Case Title (max 40 characters)"
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      maxLength={40}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Case Type</label>
                    <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Case Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Prosecution">Prosecution</SelectItem>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                        <SelectItem value="Appeal">Appeal</SelectItem>
                        <SelectItem value="Recovery">Recovery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Priority</label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Filed">Filed</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Hearing Scheduled">Hearing Scheduled</SelectItem>
                        <SelectItem value="Decision Pending">Decision Pending</SelectItem>
                        <SelectItem value="Order Issued">Order Issued</SelectItem>
                        <SelectItem value="Closed – Compliant">Closed – Compliant</SelectItem>
                        <SelectItem value="Closed – Non-Compliant">Closed – Non-Compliant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSearch} className="gap-2 bg-[#2563EB] hover:bg-[#1D4ED8]">
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                  <Button variant="outline" onClick={handleReset} className="gap-2">
                    Reset
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Search Bar and Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">show</span>
            <Select value={recordsPerPage.toString()} onValueChange={(v) => {
              setRecordsPerPage(Number(v));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">records</span>
          </div>
        </div>

        {/* Cases Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Legal Cases ({filteredCases.length})</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Columns className="h-4 w-4" />
                  Columns
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading cases...</div>
            ) : filteredCases.length > 0 ? (
              <>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Case No.</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Filed Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCases.map((legalCase) => (
                        <TableRow key={legalCase.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{legalCase.number}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{legalCase.title}</TableCell>
                          <TableCell>{legalCase.case_type}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              legalCase.priority === 'Urgent' ? 'bg-[#B91C1C] text-white border-[#DC2626]' :
                              legalCase.priority === 'High' ? 'bg-[#DC2626] text-white border-[#B91C1C]' :
                              legalCase.priority === 'Medium' ? 'bg-[#B45309] text-white border-[#C2410C]' :
                              'bg-[#0F766E] text-white border-[#0D9488]'
                            }>
                              {legalCase.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{legalCase.stage || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeClass(legalCase.status)}>
                              {legalCase.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {legalCase.filed_at ? format(new Date(legalCase.filed_at), 'MMM d, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#DBEAFE]"
                                onClick={() => navigate(`/legal/cases/${legalCase.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-[#2563EB] hover:text-[#1D4ED8] hover:bg-[#DBEAFE]"
                                onClick={() => navigate(`/legal/cases/${legalCase.id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {canCreateCase && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#FEE2E2]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredCases.length)} of {filteredCases.length} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? 'bg-[#2563EB] hover:bg-[#1D4ED8]' : ''}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <>
                        <span>...</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No cases found</p>
                {canCreateCase && (
                  <Button onClick={() => navigate('/legal/cases/new')} className="gap-2 bg-[#2563EB] hover:bg-[#1D4ED8]">
                    <Plus className="h-4 w-4" />
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
