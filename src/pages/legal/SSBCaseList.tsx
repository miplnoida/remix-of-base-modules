/** @deprecated Legal V1 legacy — retired 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. Not routed / not linked from canonical UI. */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalCases } from '@/contexts/LegalCaseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Search, Filter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';

const getStatusBadgeClass = (status: string) => {
  const statusMap: Record<string, string> = {
    'Draft': 'bg-muted text-muted-foreground',
    'Open': 'bg-secondary text-secondary-foreground',
    'Filed': 'bg-accent text-accent-foreground',
    'Under Review': 'bg-accent text-accent-foreground',
    'Pending Hearing': 'bg-secondary text-secondary-foreground',
    'In Court': 'bg-destructive text-destructive-foreground',
    'Hearing Scheduled': 'bg-secondary text-secondary-foreground',
    'Decision Pending': 'bg-accent text-accent-foreground',
    'Judgment Delivered': 'bg-accent text-accent-foreground',
    'Order Issued': 'bg-secondary text-secondary-foreground',
    'Enforcement Ongoing': 'bg-secondary text-secondary-foreground',
    'Closed – Compliant': 'bg-primary text-primary-foreground',
    'Closed – Non-Compliant': 'bg-destructive text-destructive-foreground',
    'Resolved': 'bg-primary text-primary-foreground',
    'Settled': 'bg-primary text-primary-foreground',
    'Completed': 'bg-primary text-primary-foreground',
    'Pending': 'bg-accent text-accent-foreground',
    'Withdrawn': 'bg-muted text-muted-foreground',
    'On Appeal': 'bg-destructive/80 text-destructive-foreground',
    'Reopened': 'bg-secondary text-secondary-foreground',
  };
  return statusMap[status] || 'bg-muted text-muted-foreground';
};

const CASE_TYPES = ['Employer Arrears', 'Overpayment Recovery', 'Insured Appeal', 'Compliance/Recovery', 'Other', 'Prosecution', 'Compliance', 'Appeal', 'Recovery'];
const STATUSES = ['Draft', 'Open', 'Filed', 'Pending Hearing', 'In Court', 'Judgment Delivered', 'Enforcement Ongoing', 'Closed – Compliant', 'Closed – Non-Compliant', 'Settled', 'Withdrawn', 'On Appeal', 'Reopened'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function SSBCaseList() {
  const navigate = useNavigate();
  const { cases } = useLegalCases();
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [caseNumber, setCaseNumber] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Filter logic for Query By section
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    
    return cases.filter(c => {
      const matchesCaseNumber = !caseNumber || c.number?.toLowerCase().includes(caseNumber.toLowerCase());
      const matchesTitle = !caseTitle || c.title?.toLowerCase().includes(caseTitle.toLowerCase());
      const matchesStatus = !statusFilter || statusFilter === 'all' || c.status === statusFilter;
      const matchesType = !caseTypeFilter || caseTypeFilter === 'all' || c.type === caseTypeFilter;
      const matchesPriority = !priorityFilter || priorityFilter === 'all' || c.priority === priorityFilter;
      
      return matchesCaseNumber && matchesTitle && matchesStatus && matchesType && matchesPriority;
    });
  }, [cases, caseNumber, caseTitle, statusFilter, caseTypeFilter, priorityFilter]);

  // Define DataTable columns
  const columns: DataTableColumn[] = [
    { 
      key: 'number', 
      label: 'Case No.', 
      minWidth: '120px',
      render: (value) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'filed_at', 
      label: 'Date', 
      minWidth: '120px',
      render: (value) => value ? format(new Date(value), 'MMM d, yyyy') : '-'
    },
    { 
      key: 'title', 
      label: 'Title', 
      minWidth: '200px',
      render: (value) => <span className="max-w-[300px] truncate block">{value}</span>
    },
    { 
      key: 'type', 
      label: 'Case Type', 
      minWidth: '150px' 
    },
    { 
      key: 'source', 
      label: 'Source', 
      minWidth: '120px',
      render: (value) => value || '-'
    },
    { 
      key: 'priority', 
      label: 'Priority', 
      minWidth: '100px',
      render: (value) => (
        <Badge variant="outline" className={
          value === 'Urgent' ? 'bg-destructive text-destructive-foreground border-destructive' :
          value === 'High' ? 'bg-destructive/80 text-destructive-foreground border-destructive/60' :
          value === 'Medium' ? 'bg-accent text-accent-foreground border-accent' :
          'bg-primary/10 text-primary border-primary/20'
        }>
          {value}
        </Badge>
      )
    },
    { 
      key: 'enforcement_funnel', 
      label: 'Enforcement Funnel', 
      minWidth: '150px',
      render: (value) => value || '-'
    },
    { 
      key: 'assigned_officers', 
      label: 'Assigned Officers', 
      minWidth: '200px',
      render: (value: string[]) => {
        if (!value || value.length === 0) return '-';
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((officer, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="text-xs whitespace-nowrap bg-muted text-foreground border-border"
              >
                {officer}
              </Badge>
            ))}
          </div>
        );
      }
    },
    { 
      key: 'court_reference_number', 
      label: 'Court Reference', 
      minWidth: '150px',
      render: (value) => value || '-'
    },
    { 
      key: 'stage', 
      label: 'Stage', 
      minWidth: '120px',
      render: (value) => value || '-'
    },
    { 
      key: 'status', 
      label: 'Status', 
      minWidth: '150px',
      render: (value) => (
        <Badge className={getStatusBadgeClass(value)}>
          {value}
        </Badge>
      )
    },
    { 
      key: 'next_event_at', 
      label: 'Next Hearing', 
      minWidth: '120px',
      render: (value) => value ? format(new Date(value), 'MMM d, yyyy') : '-'
    }
  ];

  const handleSearch = () => {
    // Trigger re-render by updating state
  };

  const handleReset = () => {
    setCaseNumber('');
    setCaseTitle('');
    setStatusFilter('');
    setCaseTypeFilter('');
    setPriorityFilter('');
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Main Menu
            </Button> */}
            <h1 className="text-3xl font-bold text-foreground">SSB Legal - Case Management</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/legal/cases/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              New Case
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
                        {CASE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
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
                        {PRIORITIES.map(priority => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
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
                        {STATUSES.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSearch} className="gap-2">
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

        {/* Cases DataTable */}
        <DataTable
          data={filteredCases}
          columns={columns}
          title={`Legal Cases`}
          searchPlaceholder="Search cases..."
          showRecordsOptions={[10, 25, 50, 100]}
          onView={(row) => navigate(`/legal/cases/${row.id}`)}
          onEdit={(row) => navigate(`/legal/cases/${row.id}/edit`)}
          actions={{
            view: true,
            edit: true,
          }}
          idField="id"
        />
      </div>
    </div>
  );
}
