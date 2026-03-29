import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ReadinessCheck {
  label: string;
  passed: boolean;
  required?: boolean;
  detail?: string;
}

interface AuditReadinessPanelProps {
  title?: string;
  checks: ReadinessCheck[];
  className?: string;
}

export function AuditReadinessPanel({ title = 'Readiness', checks, className }: AuditReadinessPanelProps) {
  const totalRequired = checks.filter(c => c.required !== false).length;
  const passedRequired = checks.filter(c => c.required !== false && c.passed).length;
  const percentage = totalRequired > 0 ? Math.round((passedRequired / totalRequired) * 100) : 100;
  const allReady = passedRequired === totalRequired;

  return (
    <Card className={cn(allReady ? 'border-primary/30' : 'border-amber-300/30', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full',
            allReady ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          )}>
            {percentage}%
          </span>
        </div>
        <Progress value={percentage} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-1.5 pt-2">
        {checks.map((check, idx) => (
          <div key={idx} className="flex items-start gap-2">
            {check.passed ? (
              <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            ) : check.required !== false ? (
              <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <span className={cn(
                'text-xs',
                check.passed ? 'text-foreground' : check.required !== false ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {check.label}
                {check.required === false && <span className="ml-1 text-[10px] text-muted-foreground">(optional)</span>}
              </span>
              {check.detail && <p className="text-[10px] text-muted-foreground">{check.detail}</p>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
