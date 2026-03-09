import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, Search, Filter, Eye, Building2, Clock, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const caseStatuses = [
  'All', 'Open', 'Under Review', 'Notice Issued', 'Awaiting Response',
  'Payment Arrangement', 'Inspection Scheduled', 'Legal Review',
  'Court Action', 'Judgment Monitoring', 'Enforcement in Progress', 'Resolved', 'Closed'
];

const mockCases = [
  { id: 'CASE-2026-00001', employer: 'Caribbean Hotel Group', regNo: 'R-10234', status: 'Under Review', priority: 'High', arrears: '$45,200', violations: 3, assignedTo: 'J. Williams', created: '2026-01-15', territory: 'St Kitts' },
  { id: 'CASE-2026-00002', employer: 'Island Construction Ltd', regNo: 'R-10567', status: 'Notice Issued', priority: 'Critical', arrears: '$128,500', violations: 5, assignedTo: 'M. Charles', created: '2026-01-22', territory: 'St Kitts' },
  { id: 'CASE-2026-00003', employer: 'Nevis Traders Ltd', regNo: 'R-10892', status: 'Payment Arrangement', priority: 'Medium', arrears: '$12,800', violations: 1, assignedTo: 'S. Thomas', created: '2026-02-01', territory: 'Nevis' },
  { id: 'CASE-2026-00004', employer: 'Palm View Resort', regNo: 'R-10456', status: 'Legal Review', priority: 'Critical', arrears: '$78,300', violations: 4, assignedTo: 'J. Williams', created: '2026-02-10', territory: 'St Kitts' },
  { id: 'CASE-2026-00005', employer: 'Sandy Point Bakery', regNo: 'R-10789', status: 'Open', priority: 'Low', arrears: '$3,200', violations: 1, assignedTo: 'S. Thomas', created: '2026-02-18', territory: 'St Kitts' },
  { id: 'CASE-2026-00006', employer: 'KN Shipping Services', regNo: 'R-11023', status: 'Court Action', priority: 'Critical', arrears: '$210,000', violations: 8, assignedTo: 'M. Charles', created: '2025-11-05', territory: 'St Kitts' },
  { id: 'CASE-2026-00007', employer: 'Tropical Traders Inc', regNo: 'R-11245', status: 'Awaiting Response', priority: 'Medium', arrears: '$18,400', violations: 2, assignedTo: 'J. Williams', created: '2026-02-25', territory: 'Nevis' },
];

const statusColor = (s: string) => {
  if (['Resolved', 'Closed'].includes(s)) return 'default';
  if (['Legal Review', 'Court Action', 'Enforcement in Progress'].includes(s)) return 'destructive';
  if (['Notice Issued', 'Awaiting Response'].includes(s)) return 'secondary';
  return 'outline';
};

const CaseManagement = () => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = mockCases.filter(c =>
    (statusFilter === 'All' || c.status === statusFilter) &&
    (searchTerm === '' || c.employer.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()) || c.regNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Compliance Case Management</h1>
          </div>
          <p className="text-muted-foreground">Manage employer compliance cases through their full lifecycle</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />New Case</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Cases</p><p className="text-2xl font-bold text-foreground">{mockCases.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-2xl font-bold text-warning">{mockCases.filter(c => !['Resolved','Closed'].includes(c.status)).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Legal/Court</p><p className="text-2xl font-bold text-destructive">{mockCases.filter(c => ['Legal Review','Court Action','Enforcement in Progress'].includes(c.status)).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Arrears</p><p className="text-2xl font-bold text-primary">$496K</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by case number, employer, reg no..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                {caseStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Case No</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Employer</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Territory</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Priority</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Arrears</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Violations</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Assigned To</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 border-border hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-3 font-mono text-xs font-medium text-foreground">{c.id}</td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-foreground">{c.employer}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.regNo}</p>
                    </td>
                    <td className="py-2 px-3 text-foreground">{c.territory}</td>
                    <td className="py-2 px-3"><Badge variant={statusColor(c.status)} className="text-[10px]">{c.status}</Badge></td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={c.priority === 'Critical' ? 'destructive' : c.priority === 'High' ? 'default' : 'secondary'} className="text-[10px]">{c.priority}</Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-foreground">{c.arrears}</td>
                    <td className="py-2 px-3 text-center">{c.violations}</td>
                    <td className="py-2 px-3 text-foreground">{c.assignedTo}</td>
                    <td className="py-2 px-3 text-right"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No cases match filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseManagement;
