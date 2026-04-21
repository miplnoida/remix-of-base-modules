import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scale, ArrowRight, Building2, DollarSign, Clock, Loader2, Inbox } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const REFERRAL_STATUSES = ['DRAFT', 'PENDING', 'SUBMITTED', 'ACCEPTED'];

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 0 }).format(n || 0);

const stageColor = (status: string) => {
  if (status === 'SUBMITTED' || status === 'ACCEPTED') return 'destructive' as const;
  if (status === 'PENDING') return 'default' as const;
  return 'secondary' as const;
};

const LegalQueue = () => {
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['legal-queue-referrals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_legal_referrals')
        .select('id, referral_number, employer_id, employer_name, employer_zone, grand_total, status, period_from, period_to, created_at, submitted_date')
        .in('status', REFERRAL_STATUSES)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const stageCounts = REFERRAL_STATUSES.map(s => ({
    stage: s,
    count: items.filter((i: any) => i.status === s).length,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Legal Queue</h1>
        </div>
        <p className="text-muted-foreground">Cases ready for legal escalation — review and approve legal actions</p>
      </div>

      {/* Stage Summary */}
      <div className="flex flex-wrap gap-2">
        {stageCounts.map(({ stage, count }) => (
          <Badge key={stage} variant={count > 0 ? 'default' : 'outline'} className="text-xs py-1 px-3">
            {stage} ({count})
          </Badge>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No referrals in the legal queue</p>
          <p className="text-sm mt-1">Referrals will appear here when compliance officers escalate cases for legal action</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item: any) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-foreground">{item.referral_number}</span>
                      <Badge variant={stageColor(item.status)} className="text-[10px]">{item.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="font-medium text-foreground flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{item.employer_name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{item.employer_id}</Badge>
                      <span className="font-medium text-foreground flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" />{fmtCurrency(Number(item.grand_total || 0))}</span>
                      {item.employer_zone && <span className="text-xs text-muted-foreground">{item.employer_zone}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {item.period_from && item.period_to && (
                        <span className="flex items-center gap-1">
                          <ArrowRight className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium text-foreground">Periods:</span> {item.period_from} → {item.period_to}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/compliance/enforcement/recommendation-queue')}
                    >
                      Review
                    </Button>
                    <Button size="sm" onClick={() => navigate('/compliance/enforcement/proceedings')}>
                      Escalate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LegalQueue;
