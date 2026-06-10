import { ComplianceHelpButton } from '@/components/help/ComplianceHelpButton';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, Search, Eye, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { NewCaseDialog } from '@/components/compliance/NewCaseDialog';

interface ComplianceCase {
  id: string;
  case_number: string;
  employer_id: string;
  employer_name: string | null;
  territory: string | null;
  status: string | null;
  priority: string | null;
  total_amount: number | null;
  assigned_officer_name: string | null;
  opened_date: string | null;
  risk_band: string | null;
}

const caseStatuses = [
  'All', 'OPEN', 'UNDER_REVIEW', 'NOTICE_ISSUED', 'AWAITING_RESPONSE',
  'PAYMENT_ARRANGEMENT', 'INSPECTION_SCHEDULED', 'LEGAL_REVIEW',
  'COURT_ACTION', 'JUDGMENT_MONITORING', 'ENFORCEMENT_IN_PROGRESS', 'RESOLVED', 'CLOSED'
];

const statusColor = (s: string) => {
  if (['RESOLVED', 'CLOSED'].includes(s)) return 'default' as const;
  if (['LEGAL_REVIEW', 'COURT_ACTION', 'ENFORCEMENT_IN_PROGRESS'].includes(s)) return 'destructive' as const;
  if (['NOTICE_ISSUED', 'AWAITING_RESPONSE'].includes(s)) return 'secondary' as const;
  return 'outline' as const;
};

const formatStatus = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const CaseManagement = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [newCaseOpen, setNewCaseOpen] = useState(false);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['ce_cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_cases')
        .select('*')
        .eq('is_deleted', false)
        .order('opened_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as ComplianceCase[];
    },
  });

  const filtered = cases.filter(c =>
    (statusFilter === 'All' || c.status === statusFilter) &&
    (searchTerm === '' ||
      (c.employer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.employer_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openCount = cases.filter(c => !['RESOLVED', 'CLOSED'].includes(c.status || '')).length;
  const legalCount = cases.filter(c => ['LEGAL_REVIEW', 'COURT_ACTION', 'ENFORCEMENT_IN_PROGRESS'].includes(c.status || '')).length;
  const totalArrears = cases.reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <ComplianceHelpButton screenKey="cases" />
          <Button className="gap-2" onClick={() => setNewCaseOpen(true)}><Plus className="h-4 w-4" />New Case</Button>
          <NewCaseDialog open={newCaseOpen} onOpenChange={setNewCaseOpen} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Cases</p><p className="text-2xl font-bold text-foreground">{cases.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-2xl font-bold text-warning">{openCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Legal/Court</p><p className="text-2xl font-bold text-destructive">{legalCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Arrears</p><p className="text-2xl font-bold text-primary">${totalArrears > 1000 ? `${(totalArrears / 1000).toFixed(0)}K` : totalArrears.toFixed(0)}</p></CardContent></Card>
      </div>

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
                {caseStatuses.map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All' : formatStatus(s)}</SelectItem>)}
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
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Risk</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Assigned To</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 border-border hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-3 font-mono text-xs font-medium text-foreground">{c.case_number}</td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-foreground">{c.employer_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.employer_id}</p>
                    </td>
                    <td className="py-2 px-3 text-foreground">{c.territory}</td>
                    <td className="py-2 px-3"><Badge variant={statusColor(c.status || '')} className="text-[10px]">{formatStatus(c.status || '')}</Badge></td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={c.priority === 'Critical' ? 'destructive' : c.priority === 'High' ? 'default' : 'secondary'} className="text-[10px]">{c.priority}</Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-foreground">${(Number(c.total_amount) || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-center">
                      {c.risk_band && <Badge variant="outline" className="text-[10px]">{c.risk_band}</Badge>}
                    </td>
                    <td className="py-2 px-3 text-foreground">{c.assigned_officer_name || '—'}</td>
                    <td className="py-2 px-3 text-right"><Button variant="ghost" size="sm" onClick={() => navigate(`/compliance/cases/${c.id}`)}><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No cases found</td></tr>
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
