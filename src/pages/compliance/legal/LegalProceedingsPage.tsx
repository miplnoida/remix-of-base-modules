import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gavel, Eye, Calendar, Building2, DollarSign, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mockProceedings = [
  { id: 'LGL-2026-00034', employer: 'KN Shipping Services', regNo: 'R-11023', stage: 'Summons', arrears: '$210,000', filedDate: '2026-01-15', nextHearing: '2026-03-12', court: 'Magistrate Court', solicitor: 'A. Harris', outcome: 'Pending' },
  { id: 'LGL-2026-00028', employer: 'Island Construction Ltd', regNo: 'R-10567', stage: 'Judgment Summons', arrears: '$128,500', filedDate: '2025-11-20', nextHearing: '2026-03-15', court: 'High Court', solicitor: 'A. Harris', outcome: 'Pending' },
  { id: 'LGL-2026-00041', employer: 'Nevis Traders Ltd', regNo: 'R-10892', stage: 'Writ of Execution', arrears: '$52,000', filedDate: '2025-09-10', nextHearing: '2026-03-20', court: 'Magistrate Court', solicitor: 'D. Francis', outcome: 'Pending' },
  { id: 'LGL-2025-00089', employer: 'Palm View Resort', regNo: 'R-10456', stage: 'Recovery Monitoring', arrears: '$35,000', filedDate: '2025-06-01', nextHearing: '—', court: 'Magistrate Court', solicitor: 'A. Harris', outcome: 'Judgment Granted' },
  { id: 'LGL-2025-00076', employer: 'Tropical Imports', regNo: 'R-10333', stage: 'Commitment/JDS', arrears: '$92,000', filedDate: '2025-04-15', nextHearing: '2026-04-01', court: 'High Court', solicitor: 'D. Francis', outcome: 'Pending' },
];

const stageColor = (stage: string) => {
  if (['Writ of Execution', 'Commitment/JDS'].includes(stage)) return 'destructive';
  if (['Summons', 'Judgment Summons'].includes(stage)) return 'default';
  if (stage === 'Recovery Monitoring') return 'secondary';
  return 'outline';
};

const LegalProceedingsPage = () => {
  const [search, setSearch] = useState('');

  const filtered = mockProceedings.filter(p =>
    search === '' || p.employer.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gavel className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Legal Proceedings</h1>
        </div>
        <p className="text-muted-foreground">Active legal cases, court proceedings, and enforcement tracking</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Active</p><p className="text-2xl font-bold text-foreground">{mockProceedings.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Court Stage</p><p className="text-2xl font-bold text-destructive">{mockProceedings.filter(p => ['Summons','Judgment Summons','Writ of Execution','Commitment/JDS'].includes(p.stage)).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Recovery Phase</p><p className="text-2xl font-bold text-success">{mockProceedings.filter(p => p.stage === 'Recovery Monitoring').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Arrears</p><p className="text-2xl font-bold text-primary">$517K</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by case number or employer..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Case No</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Employer</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Stage</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Arrears</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Court</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Next Hearing</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Solicitor</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Outcome</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b last:border-0 border-border hover:bg-muted/50">
                    <td className="py-2 px-3 font-mono text-xs font-medium text-foreground">{p.id}</td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-foreground">{p.employer}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.regNo}</p>
                    </td>
                    <td className="py-2 px-3 text-center"><Badge variant={stageColor(p.stage)} className="text-[10px]">{p.stage}</Badge></td>
                    <td className="py-2 px-3 text-right font-medium text-foreground">{p.arrears}</td>
                    <td className="py-2 px-3 text-foreground">{p.court}</td>
                    <td className="py-2 px-3 text-foreground">{p.nextHearing}</td>
                    <td className="py-2 px-3 text-foreground">{p.solicitor}</td>
                    <td className="py-2 px-3 text-center"><Badge variant={p.outcome === 'Judgment Granted' ? 'default' : 'outline'} className="text-[10px]">{p.outcome}</Badge></td>
                    <td className="py-2 px-3 text-right"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalProceedingsPage;
