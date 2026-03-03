import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, Edit, Search, Filter, Download, Plus } from 'lucide-react';

const CaseTracking = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const mockCases = [
    {
      id: 'LC-2024-089',
      type: 'Non-Compliance',
      party: 'ABC Manufacturing Ltd (EMP-001)',
      status: 'Under Review',
      priority: 'High',
      dateCreated: '2024-01-15',
      assignedOfficer: 'Sarah Johnson',
      description: 'Late contribution payments for Q4 2023',
      slaStatus: 'Within SLA',
      daysOpen: 12,
      nextAction: 'Review evidence',
      nextActionDate: '2024-01-25'
    },
    {
      id: 'LC-2024-088',
      type: 'Benefit Dispute',
      party: 'John Smith (123-45-6789)',
      status: 'In Legal Action',
      priority: 'Medium',
      dateCreated: '2024-01-12',
      assignedOfficer: 'Michael Chen',
      description: 'Disability benefit calculation dispute',
      slaStatus: 'At Risk',
      daysOpen: 15,
      nextAction: 'Court hearing',
      nextActionDate: '2024-02-15'
    },
    {
      id: 'LC-2024-087',
      type: 'Appeal',
      party: 'XYZ Services Corp (EMP-002)',
      status: 'Filed',
      priority: 'Low',
      dateCreated: '2024-01-10',
      assignedOfficer: 'Lisa Wang',
      description: 'Appeal against penalty assessment',
      slaStatus: 'Within SLA',
      daysOpen: 17,
      nextAction: 'Schedule review',
      nextActionDate: '2024-01-30'
    },
    {
      id: 'LC-2024-086',
      type: 'Fraud Investigation',
      party: 'Tech Solutions Inc (EMP-003)',
      status: 'Under Review',
      priority: 'High',
      dateCreated: '2024-01-08',
      assignedOfficer: 'David Rodriguez',
      description: 'Suspected fraudulent wage reporting',
      slaStatus: 'Overdue',
      daysOpen: 19,
      nextAction: 'Evidence collection',
      nextActionDate: '2024-01-20'
    },
    {
      id: 'LC-2024-085',
      type: 'Non-Compliance',
      party: 'Small Business Ltd (EMP-004)',
      status: 'Resolved',
      priority: 'Medium',
      dateCreated: '2023-12-15',
      assignedOfficer: 'Emma Thompson',
      description: 'Late registration compliance issue',
      slaStatus: 'Completed',
      daysOpen: 21,
      nextAction: 'Case closed',
      nextActionDate: 'N/A'
    }
  ];

  const filteredCases = mockCases.filter(case_ => {
    const matchesSearch = searchTerm === '' || 
      case_.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || case_.status === statusFilter;
    const matchesType = typeFilter === '' || case_.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Filed': return 'secondary';
      case 'Under Review': return 'default';
      case 'In Legal Action': return 'destructive';
      case 'Resolved': return 'default';
      default: return 'secondary';
    }
  };

  const getSLABadgeVariant = (slaStatus: string) => {
    switch (slaStatus) {
      case 'Within SLA': return 'default';
      case 'At Risk': return 'secondary';
      case 'Overdue': return 'destructive';
      case 'Completed': return 'default';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/legal')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Legal Module
              </Button>
              <div className="h-6 w-px bg-border" />
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Legal Module</span>
                <span>/</span>
                <span className="text-foreground font-medium">Case Tracking</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={() => navigate('/legal/case-intake')}>
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Case Detail & Tracking</h1>
          <p className="text-muted-foreground">Monitor and track all legal cases and their progress</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Legal Cases</CardTitle>
                <CardDescription>All cases with status tracking and SLA monitoring</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cases..."
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="Filed">Filed</SelectItem>
                    <SelectItem value="Under Review">Under Review</SelectItem>
                    <SelectItem value="In Legal Action">In Legal Action</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === 'ALL' ? '' : v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="Non-Compliance">Non-Compliance</SelectItem>
                    <SelectItem value="Benefit Dispute">Benefit Dispute</SelectItem>
                    <SelectItem value="Appeal">Appeal</SelectItem>
                    <SelectItem value="Fraud Investigation">Fraud Investigation</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SLA Status</TableHead>
                  <TableHead>Days Open</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((case_) => (
                  <TableRow key={case_.id}>
                    <TableCell className="font-medium">{case_.id}</TableCell>
                    <TableCell>{case_.type}</TableCell>
                    <TableCell className="max-w-48 truncate">{case_.party}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(case_.status)}>
                        {case_.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(case_.priority)}>
                        {case_.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSLABadgeVariant(case_.slaStatus)}>
                        {case_.slaStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{case_.daysOpen}</TableCell>
                    <TableCell>{case_.assignedOfficer}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{case_.nextAction}</div>
                        <div className="text-xs text-muted-foreground">{case_.nextActionDate}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/legal/case-detail/${case_.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/legal/case-edit/${case_.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredCases.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No cases found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CaseTracking;