import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
  onClick?: () => void;
}

const variantStyles = {
  default: "border-border",
  success: "border-l-4 border-l-primary",
  warning: "border-l-4 border-l-accent",
  error: "border-l-4 border-l-destructive",
  info: "border-l-4 border-l-secondary",
};

const iconVariantStyles = {
  default: "text-muted-foreground",
  success: "text-primary",
  warning: "text-accent-foreground",
  error: "text-destructive",
  info: "text-secondary",
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
  onClick,
}: MetricCardProps) {
  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md",
        variantStyles[variant],
        onClick && "cursor-pointer hover:border-primary",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className={cn("h-5 w-5", iconVariantStyles[variant])} />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {(subtitle || trend) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            {subtitle && <span>{subtitle}</span>}
            {trend && (
              <span className={cn(
                "font-medium",
                trend.isPositive ? "text-primary" : "text-destructive"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
