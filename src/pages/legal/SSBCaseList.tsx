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
    'Draft': 'bg-[#6B7280] text-white',
    'Open': 'bg-[#0284C7] text-white',
    'Filed': 'bg-[#B45309] text-white',
    'Under Review': 'bg-[#B45309] text-white',
    'Pending Hearing': 'bg-[#0F766E] text-white',
    'In Court': 'bg-[#B91C1C] text-white',
    'Hearing Scheduled': 'bg-[#0F766E] text-white',
    'Decision Pending': 'bg-[#B45309] text-white',
    'Judgment Delivered': 'bg-[#B45309] text-white',
    'Order Issued': 'bg-[#6D28D9] text-white',
    'Enforcement Ongoing': 'bg-[#6D28D9] text-white',
    'Closed – Compliant': 'bg-[#166534] text-white',
    'Closed – Non-Compliant': 'bg-[#B91C1C] text-white',
    'Resolved': 'bg-[#047857] text-white',
    'Settled': 'bg-[#047857] text-white',
    'Completed': 'bg-[#047857] text-white',
    'Pending': 'bg-[#B45309] text-white',
    'Withdrawn': 'bg-[#6B7280] text-white',
    'On Appeal': 'bg-[#9D174D] text-white',
    'Reopened': 'bg-[#3730A3] text-white',
  };
  return statusMap[status] || 'bg-[#6B7280] text-white';
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
          value === 'Urgent' ? 'bg-[#B91C1C] text-white border-[#DC2626]' :
          value === 'High' ? 'bg-[#DC2626] text-white border-[#B91C1C]' :
          value === 'Medium' ? 'bg-[#B45309] text-white border-[#C2410C]' :
          'bg-[#0F766E] text-white border-[#0D9488]'
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
                className="text-xs whitespace-nowrap bg-blue-100 text-blue-800 border-blue-200"
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
            <Button onClick={() => navigate('/legal/cases/new')} className="gap-2 bg-[#2563EB] hover:bg-[#1D4ED8]">
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

        {/* Cases DataTable */}
        <DataTable
          data={filteredCases}
          columns={columns}
          title={`Legal Cases`}
          searchPlaceholder="Search cases..."
          showRecordsOptions={[10, 25, 50, 100]}
          onView={(row) => navigate(`/legal/cases/${row.id}`)}
          onEdit={(row) => navigate(`/legal/cases/${row.id}/edit`)}
          onApprove={(id) => {
            // TODO: Implement approve logic
            console.log('Approve case:', id);
          }}
          onReject={(id) => {
            // TODO: Implement reject logic
            console.log('Reject case:', id);
          }}
          actions={{
            view: true,
            edit: true,
            approve: true,
            reject: true
          }}
          idField="id"
        />
      </div>
    </div>
  );
}
