import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, DollarSign, TrendingUp, UserCheck } from 'lucide-react';
import type { SimulationOutput } from '@/services/complianceSimulatorEngine';

interface Props {
  output: SimulationOutput | null;
}

export default function RecommendedAction({ output }: Props) {
  if (!output) return null;

  const { summary, recommendations } = output;

  const getIcon = (rec: string) => {
    if (rec.startsWith('✅')) return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />;
    if (rec.startsWith('🔴')) return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
    if (rec.startsWith('🟡')) return <UserCheck className="h-4 w-4 text-amber-500 shrink-0" />;
    if (rec.startsWith('💰')) return <DollarSign className="h-4 w-4 text-blue-500 shrink-0" />;
    if (rec.startsWith('⚡') || rec.startsWith('👤')) return <TrendingUp className="h-4 w-4 text-purple-500 shrink-0" />;
    return <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  return (
    <Card className={summary.wouldCreateViolation ? 'border-red-200 dark:border-red-900' : 'border-emerald-200 dark:border-emerald-900'}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Recommended Action</span>
          {summary.wouldCreateViolation ? (
            <Badge variant="destructive" className="text-[10px]">Action Required</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">No Issue</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {getIcon(rec)}
            <span>{rec.replace(/^[✅🔴🟡💰⚡👤]\s*/, '')}</span>
          </div>
        ))}

        {summary.financialImpact > 0 && (
          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total Simulated Financial Impact</span>
              <span className="font-bold text-foreground">EC${summary.financialImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
