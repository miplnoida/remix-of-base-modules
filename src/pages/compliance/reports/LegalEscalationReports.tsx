import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Scale, FileText, TrendingUp, Download, Loader2, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { exportReportToExcel } from '@/utils/reportExcelExport';

const STAGE_GROUPS: Record<string, string[]> = {
  review: ['Legal Review', 'Under Review'],
  notice: ['Notice Issued', 'Demand Letter'],
  court: ['Summons', 'Judgment Summons', 'Writ of Execution', 'Commitment/JDS'],
};

export default function LegalEscalationReports() {
  const [stage, setStage] = useState('all');
  const [appliedStage, setAppliedStage] = useState('all');

  const { data: legalData = [], isLoading } = useQuery({
    queryKey: ['ce_legal_proceedings_report'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_legal_proceedings').select('*').order('filed_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return legalData.filter((r: any) => {
      if (appliedStage === 'all') return true;
      const allowedStages = STAGE_GROUPS[appliedStage] || [];
      return allowedStages.includes(r.stage);
    });
  }, [legalData, appliedStage]);

  const totalArrears = filtered.reduce((sum, r) => sum + Number(r.arrears || 0), 0);
  const courtProceedings = filtered.filter(r => STAGE_GROUPS.court.includes(r.stage)).length;

  const handleApply = () => setAppliedStage(stage);

  const handleExport = async () => {
    await exportReportToExcel(
      filtered.map((r: any) => ({
        employer_name: r.employer_name,
        stage: r.stage,
        arrears: Number(r.arrears || 0),
        filed_date: r.filed_date,
        court: r.court,
        outcome: r.outcome,
      })),
      [
        { header: 'Employer', key: 'employer_name', width: 32 },
        { header: 'Stage', key: 'stage', width: 22 },
        { header: 'Arrears (EC$)', key: 'arrears', width: 16 },
        { header: 'Filed', key: 'filed_date', width: 14 },
        { header: 'Court', key: 'court', width: 22 },
        { header: 'Outcome', key: 'outcome', width: 18 },
      ],
      'legal_escalation',
      'Legal Cases'
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Legal Escalation Reports" subtitle="Cases escalated to legal, court proceedings, and outcomes" breadcrumbs={[{ label: 'Compliance', href: '/compliance/dashboard' }, { label: 'Reports', href: '/compliance/reports' }, { label: 'Legal Escalation' }]} />

      <Card><CardHeader><CardTitle>Filters</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><label className="text-sm font-medium mb-2 block">Legal Stage</label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="review">Legal Review</SelectItem>
                <SelectItem value="notice">Notice Issued</SelectItem>
                <SelectItem value="court">Court Proceedings</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end md:col-start-4"><Button className="w-full" onClick={handleApply}>Apply Filters</Button></div>
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Cases in Legal</p><p className="text-2xl font-bold text-foreground">{filtered.length}</p></div><Scale className="h-8 w-8 text-destructive" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Court Proceedings</p><p className="text-2xl font-bold text-foreground">{courtProceedings}</p></div><FileText className="h-8 w-8 text-warning" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Arrears</p><p className="text-2xl font-bold text-foreground">EC$ {(totalArrears / 1000).toFixed(0)}K</p></div><AlertTriangle className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending Outcome</p><p className="text-2xl font-bold text-foreground">{filtered.filter(r => r.outcome === 'Pending').length}</p></div><TrendingUp className="h-8 w-8 text-warning" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>Legal Cases Details</CardTitle><Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}><Download className="h-4 w-4 mr-2" />Export CSV</Button></div></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <div className="flex flex-col items-center py-8"><Inbox className="h-10 w-10 text-muted-foreground mb-2" /><p className="text-muted-foreground">No legal escalation data</p></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Employer</TableHead><TableHead>Stage</TableHead><TableHead className="text-right">Arrears</TableHead><TableHead>Filed</TableHead><TableHead>Court</TableHead><TableHead>Outcome</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.employer_name}</TableCell>
                    <TableCell>{row.stage}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">EC$ {(Number(row.arrears) / 1000).toFixed(0)}K</TableCell>
                    <TableCell>{row.filed_date}</TableCell>
                    <TableCell>{row.court}</TableCell>
                    <TableCell><span className={row.outcome === 'Judgment Granted' ? 'text-success' : 'text-warning'}>{row.outcome}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
