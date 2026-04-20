import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComplianceWorkbench, type WorkbenchMetric } from '@/hooks/useComplianceWorkbench';
import type { ComplianceOperationalRole } from '@/lib/compliance/capabilities';

interface Props {
  role: ComplianceOperationalRole;
  title: string;
  subtitle: string;
}

const toneClass = (tone?: WorkbenchMetric['tone']) => {
  switch (tone) {
    case 'danger':
      return 'border-destructive/40 bg-destructive/5';
    case 'warning':
      return 'border-warning/40 bg-warning/5';
    case 'success':
      return 'border-success/40 bg-success/5';
    default:
      return 'border-border';
  }
};

export default function RoleWorkbench({ role, title, subtitle }: Props) {
  const { data, isLoading } = useComplianceWorkbench(role);
  const metrics = data?.metrics ?? [];

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <Badge variant="outline" className="capitalize">
            {role}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {metrics.map((m) => (
            <Link key={m.key} to={m.href} className="group">
              <Card className={cn('transition-all hover:shadow-md', toneClass(m.tone))}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    {m.tone === 'danger' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    {m.tone === 'success' && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {m.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-bold tabular-nums">{m.count}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {metrics.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No workbench items available for your role.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
