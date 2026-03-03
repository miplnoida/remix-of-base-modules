import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardKPICardProps {
  title: string;
  value: string;
  change?: string;
  changeLabel?: string;
  icon: LucideIcon;
  iconBg?: string;
  onClick?: () => void;
}

export function DashboardKPICard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  iconBg = 'bg-primary/10 text-primary',
  onClick,
}: DashboardKPICardProps) {
  const isPositive = change?.startsWith('+');
  const isNegative = change?.startsWith('-');
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-card-hover',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-muted-foreground leading-none">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {value}
            </p>
            {change && (
              <div className="flex items-center gap-1.5">
                <TrendIcon
                  className={cn(
                    'h-3.5 w-3.5',
                    isPositive && 'text-secondary',
                    isNegative && 'text-destructive',
                    !isPositive && !isNegative && 'text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-xs font-medium',
                    isPositive && 'text-secondary',
                    isNegative && 'text-destructive',
                    !isPositive && !isNegative && 'text-muted-foreground'
                  )}
                >
                  {change}
                </span>
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>
          <div className={cn('p-2.5 rounded-lg', iconBg)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
