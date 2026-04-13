import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Loader2, Calculator, Percent } from 'lucide-react';

interface FinancialSummaryCardProps {
  violationId: string;
  principalAmount: number;
  penaltyAmount: number;
  interestAmount: number;
  totalAmount: number;
  employerId?: string;
}

export function FinancialSummaryCard({
  violationId,
  principalAmount,
  penaltyAmount,
  interestAmount,
  totalAmount,
  employerId,
}: FinancialSummaryCardProps) {
  // Fetch applicable calculation rules
  const { data: calcRules = [] } = useQuery({
    queryKey: ['ce_calculation_rules_for_violation', violationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_calculation_rules')
        .select('rule_code, name, formula_expression, parameters, is_enabled')
        .eq('is_enabled', true)
        .order('rule_code');
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amount);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Principal</div>
            <div className="text-lg font-semibold">{formatCurrency(principalAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Penalties</div>
            <div className="text-lg font-semibold text-orange-600">{formatCurrency(penaltyAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Interest</div>
            <div className="text-lg font-semibold text-yellow-600">{formatCurrency(interestAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Due</div>
            <div className="text-lg font-bold text-destructive">{formatCurrency(totalAmount)}</div>
          </div>
        </div>

        {calcRules.length > 0 && (
          <div className="border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Calculator className="h-3 w-3" /> Applicable Rules
            </div>
            <div className="space-y-1.5">
              {calcRules.slice(0, 5).map((rule: any) => (
                <div key={rule.rule_code} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{rule.rule_code}</Badge>
                    <span className="text-muted-foreground">{rule.name}</span>
                  </div>
                  {rule.formula_expression && (
                    <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {rule.formula_expression}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
