import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListChecks, ArrowRight, Clock, Building2, AlertTriangle, DollarSign, Loader2, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 0 }).format(n || 0);

const daysSince = (iso: string | null) => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

const priorityRank = (p: string) =>
  ({ Critical: 0, High: 1, Medium: 2, Low: 3 } as Record<string, number>)[p] ?? 4;

const CaseQueue = () => {
  const navigate = useNavigate();

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['compliance-case-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_cases')
        .select('id, case_number, employer_id, employer_name, priority, status, total_amount, opened_date, summary, target_resolution_date')
        .neq('status', 'CLOSED')
        .neq('status', 'RESOLVED')
        .eq('is_deleted', false)
        .order('priority', { ascending: true })
        .limit(100);
      if (error) throw error;
      const sorted = [...(data || [])].sort((a: any, b: any) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return new Date(a.opened_date || 0).getTime() - new Date(b.opened_date || 0).getTime();
      });
      return sorted;
    },
  });

  const counts = {
    Critical: cases.filter((c: any) => c.priority === 'Critical').length,
    High: cases.filter((c: any) => c.priority === 'High').length,
    Medium: cases.filter((c: any) => c.priority === 'Medium').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Case Queue</h1>
        </div>
        <p className="text-muted-foreground">Prioritized queue of compliance cases requiring immediate action — sorted by urgency</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Critical</p><p className="text-2xl font-bold text-destructive">{counts.Critical}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">High</p><p className="text-2xl font-bold text-warning">{counts.High}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Medium</p><p className="text-2xl font-bold text-primary">{counts.Medium}</p></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : cases.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No open cases in the queue</p>
          <p className="text-sm mt-1">All cases are resolved or closed</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {cases.map((item: any, idx: number) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground font-medium">#{idx + 1}</span>
                      <span className="font-mono text-sm font-medium text-foreground">{item.case_number}</span>
                      <Badge variant={item.priority === 'Critical' ? 'destructive' : item.priority === 'High' ? 'default' : 'secondary'} className="text-[10px]">
                        {item.priority || 'Medium'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-foreground font-medium flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{item.employer_name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{item.employer_id}</Badge>
                      <span className="text-sm text-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" />{fmtCurrency(Number(item.total_amount || 0))}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{daysSince(item.opened_date)} days open</span>
                    </div>
                    {item.summary && (
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                        <span className="text-muted-foreground line-clamp-2">{item.summary}</span>
                      </div>
                    )}
                    {item.target_resolution_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-muted-foreground"><span className="font-medium text-foreground">Target resolution:</span> {item.target_resolution_date}</span>
                      </div>
                    )}
                  </div>
                  <Button size="sm" className="ml-4" onClick={() => navigate(`/compliance/cases/${item.id}`)}>
                    Take Action
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaseQueue;
