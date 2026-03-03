import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  'Draft': 'bg-secondary text-secondary-foreground border border-secondary/80',
  'Filed': 'bg-accent text-accent-foreground border border-accent/80',
  'Pending Hearing': 'bg-primary/80 text-primary-foreground border border-primary/60',
  'In Court': 'bg-destructive text-destructive-foreground border border-destructive/80',
  'Judgment Delivered': 'bg-accent text-accent-foreground border border-accent/80',
  'Enforcement Ongoing': 'bg-secondary/80 text-secondary-foreground border border-secondary/60',
  'Closed – Compliant': 'bg-primary text-primary-foreground border border-primary/80',
  'Closed – Non-Compliant': 'bg-destructive text-destructive-foreground border border-destructive/80',
  'Settled': 'bg-primary text-primary-foreground border border-primary/80',
  'Withdrawn': 'bg-muted text-muted-foreground border border-border',
  'On Appeal': 'bg-destructive/80 text-destructive-foreground border border-destructive/60',
  'Reopened': 'bg-secondary text-secondary-foreground border border-secondary/80',
  'Under Review': 'bg-accent text-accent-foreground border border-accent/80',
  'Hearing Scheduled': 'bg-primary/80 text-primary-foreground border border-primary/60',
  'Hearing Held': 'bg-primary/70 text-primary-foreground border border-primary/50',
  'Decision Pending': 'bg-accent text-accent-foreground border border-accent/80',
  'Order Issued': 'bg-secondary/80 text-secondary-foreground border border-secondary/60',
  'Appealed': 'bg-destructive/80 text-destructive-foreground border border-destructive/60',
  'Resolved': 'bg-primary text-primary-foreground border border-primary/80',
  'Completed': 'bg-primary text-primary-foreground border border-primary/80',
  'Within SLA': 'bg-primary text-primary-foreground border border-primary/80',
  'At Risk': 'bg-destructive text-destructive-foreground border border-destructive/80',
  'Overdue': 'bg-destructive text-destructive-foreground border border-destructive/80',
  'Medium': 'bg-accent text-accent-foreground border border-accent/80',
  'Low': 'bg-primary/80 text-primary-foreground border border-primary/60',
  'High': 'bg-destructive text-destructive-foreground border border-destructive/80',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = statusStyles[status] || 'bg-muted text-muted-foreground border border-border';
  
  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        styles,
        className
      )}
      role="status"
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}
