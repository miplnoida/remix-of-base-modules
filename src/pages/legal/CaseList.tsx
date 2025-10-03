import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Users, 
  MoreVertical,
  Download,
  UserPlus,
  RefreshCw,
  Tag,
  ArrowLeft,
  Home,
  Scale,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { LegalCase, STATUS_COLOR_MAP, SavedView } from '@/types/legal';
import { LegalService } from '@/services/legalService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const CaseList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [selectedView, setSelectedView] = useState<string>('VIEW-001');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [caseTypeFilter, setCaseTypeFilter] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [casesData, viewsData] = await Promise.all([
        LegalService.getCases(),
        LegalService.getSavedViews(),
      ]);
      setCases(casesData);
      setSavedViews(viewsData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cases',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(c.status);
    const matchesType = caseTypeFilter.length === 0 || caseTypeFilter.includes(c.caseType);
    return matchesSearch && matchesStatus && matchesType;
  });

  const toggleCaseSelection = (caseId: string) => {
    const newSelection = new Set(selectedCases);
    if (newSelection.has(caseId)) {
      newSelection.delete(caseId);
    } else {
      newSelection.add(caseId);
    }
    setSelectedCases(newSelection);
  };

  const handleBulkAction = (action: string) => {
    toast({
      title: 'Bulk Action',
      description: `${action} applied to ${selectedCases.size} case(s)`,
    });
    setSelectedCases(new Set());
  };

  const handleClose = () => {
    navigate('/');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter([]);
    setCaseTypeFilter([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-border" />
          <Scale className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Legal Cases</h1>
            <p className="text-muted-foreground">Search and manage all legal cases</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate('/legal/cases/new')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Case
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Main Menu
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cases.filter(c => !['Closed – Compliant', 'Closed – Non-Compliant', 'Withdrawn'].includes(c.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {cases.filter(c => c.flags.includes('Urgent')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hearings This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {cases.filter(c => c.status === 'Hearing Scheduled').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Section - Collapsible */}
      <Collapsible open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Search & Filter Cases</CardTitle>
                  <CardDescription>Query by: Case Number, Title, Status, Type, Assignee, Flags, etc.</CardDescription>
                </div>
                {isSearchOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Saved Views</label>
                    <Select value={selectedView} onValueChange={setSelectedView}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {savedViews.map(view => (
                          <SelectItem key={view.id} value={view.id}>
                            {view.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by number or title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter[0]} onValueChange={(value) => setStatusFilter([value])}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Filed">Filed</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Hearing Scheduled">Hearing Scheduled</SelectItem>
                        <SelectItem value="Decision Pending">Decision Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Case Type</label>
                    <Select value={caseTypeFilter[0]} onValueChange={(value) => setCaseTypeFilter([value])}>
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
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
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClearFilters}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Advanced Filters
                  </Button>
                  <Button variant="outline" onClick={handleClose}>
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Bulk Actions */}
      {selectedCases.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="font-medium">{selectedCases.size} case(s) selected</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('Assign')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('Change Status')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Change Status
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('Add Tag')}>
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkAction('Export')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Legal Cases ({filteredCases.length})</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No cases found</h3>
              <p className="text-muted-foreground mb-4">Get started by creating your first case</p>
              <Button onClick={() => navigate('/legal/cases/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Next Event</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((case_) => (
                  <TableRow key={case_.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedCases.has(case_.id)}
                        onCheckedChange={() => toggleCaseSelection(case_.id)}
                      />
                    </TableCell>
                    <TableCell onClick={() => navigate(`/legal/cases/${case_.id}`)}>
                      <span className="font-mono text-sm font-medium text-blue-600 hover:underline">
                        {case_.number}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/legal/cases/${case_.id}`)}>
                      <div className="font-medium">{case_.title}</div>
                    </TableCell>
                    <TableCell>{case_.caseType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLOR_MAP[case_.status]}>
                        {case_.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{case_.assignee}</TableCell>
                    <TableCell>
                      {case_.nextEventAt ? new Date(case_.nextEventAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">{case_.ageDays}d</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {case_.flags.map(flag => (
                          <Badge key={flag} variant="secondary" className="text-xs">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuItem onClick={() => navigate(`/legal/cases/${case_.id}`)}>
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem>Assign</DropdownMenuItem>
                          <DropdownMenuItem>Change Status</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
