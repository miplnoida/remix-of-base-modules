import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import type { BuilderValidationIssue } from './types';

export function ValidationPanel({ issues }: { issues: BuilderValidationIssue[] }) {
  const errors = issues.filter((i) => i.severity === 'ERROR');
  const warnings = issues.filter((i) => i.severity === 'WARNING');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Validation
          <Badge variant={errors.length ? 'destructive' : 'secondary'} className="text-[10px]">
            {errors.length} error · {warnings.length} warn
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <Alert><ShieldCheck className="h-4 w-4" /><AlertDescription className="text-xs">Canvas passes validation.</AlertDescription></Alert>
        ) : (
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {issues.map((i, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <AlertTriangle className={`h-3 w-3 mt-0.5 ${i.severity === 'ERROR' ? 'text-destructive' : 'text-muted-foreground'}`} />
                <span><Badge variant="outline" className="mr-1 text-[9px]">{i.section ?? '—'}</Badge>{i.message}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
