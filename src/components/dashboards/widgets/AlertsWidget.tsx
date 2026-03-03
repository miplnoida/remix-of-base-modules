import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, Clock, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertItem {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  time: string;
}

const alerts: AlertItem[] = [
  { severity: 'critical', title: '23 employers overdue on C3 filing', detail: 'February 2026 filing deadline passed', time: 'Action required' },
  { severity: 'warning', title: '5 payment plans at risk of breach', detail: 'Missed installment within 7 days', time: '2 days left' },
  { severity: 'warning', title: 'Pending benefit approvals reaching SLA', detail: '12 claims pending > 10 business days', time: 'Escalate' },
  { severity: 'info', title: 'System maintenance scheduled', detail: 'Database optimization – Sunday 2 AM', time: 'Mar 9' },
];

const severityConfig = {
  critical: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    icon: AlertTriangle,
    iconColor: 'text-destructive',
    badge: 'bg-destructive text-destructive-foreground',
  },
  warning: {
    bg: 'bg-accent/10',
    border: 'border-accent/30',
    icon: FileWarning,
    iconColor: 'text-accent-foreground',
    badge: 'bg-accent text-accent-foreground',
  },
  info: {
    bg: 'bg-primary/5',
    border: 'border-primary/15',
    icon: Clock,
    iconColor: 'text-primary',
    badge: 'bg-primary/15 text-primary',
  },
};

export function AlertsWidget() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Bell className="h-5 w-5 text-accent" />
            Alerts & Notifications
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {alerts.length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert, i) => {
            const cfg = severityConfig[alert.severity];
            const Icon = cfg.icon;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  cfg.bg,
                  cfg.border
                )}
              >
                <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', cfg.iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.detail}</p>
                </div>
                <Badge className={cn('text-[10px] px-2 py-0.5 whitespace-nowrap', cfg.badge)}>
                  {alert.time}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
