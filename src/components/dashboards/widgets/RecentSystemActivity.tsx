import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, AlertTriangle, UserPlus, FileText, DollarSign, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ActivityEntry {
  icon: LucideIcon;
  iconColor: string;
  action: string;
  entity: string;
  time: string;
}

const activities: ActivityEntry[] = [
  { icon: UserPlus, iconColor: 'text-primary', action: 'New employer registered', entity: 'Caribbean Shipping Ltd – #EMP-2026-1847', time: '12 min ago' },
  { icon: DollarSign, iconColor: 'text-secondary', action: 'Contribution payment received', entity: 'Nevis Hotels Group – EC$24,500', time: '28 min ago' },
  { icon: AlertTriangle, iconColor: 'text-destructive', action: 'Compliance violation flagged', entity: 'Island Traders Inc – Missing C3 filing', time: '1 hr ago' },
  { icon: CheckCircle2, iconColor: 'text-secondary', action: 'Benefit claim approved', entity: 'Age Benefit – Claim #CLM-2026-0394', time: '2 hrs ago' },
  { icon: FileText, iconColor: 'text-primary', action: 'Bulk ID cards generated', entity: '320 cards processed – Batch #B-0891', time: '3 hrs ago' },
  { icon: Shield, iconColor: 'text-primary', action: 'Field inspection completed', entity: 'Frigate Bay Zone – Inspector M. Thomas', time: '4 hrs ago' },
  { icon: DollarSign, iconColor: 'text-secondary', action: 'Payment plan installment received', entity: 'St. Kitts Contractors – EC$8,200', time: '5 hrs ago' },
];

export function RecentSystemActivity() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Activity className="h-5 w-5 text-primary" />
          Recent System Activity
        </CardTitle>
        <p className="text-xs text-muted-foreground">Latest events across all modules</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {activities.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <div className="mt-0.5">
                <a.icon className={cn('h-4 w-4', a.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug">{a.action}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">{a.entity}</p>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap pt-0.5">{a.time}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
