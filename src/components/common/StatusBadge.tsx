import React from 'react';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<string, string> = {
  // Plan statuses
  'Draft': 'bg-muted text-muted-foreground',
  'Submitted': 'bg-secondary/10 text-secondary border-secondary/20',
  'Approved': 'bg-primary/10 text-primary border-primary/20',
  'In Progress': 'bg-accent/30 text-accent-foreground border-accent/20',
  'Completed': 'bg-primary/10 text-primary border-primary/20',
  'Rejected': 'bg-destructive/10 text-destructive border-destructive/20',
  'Cancelled': 'bg-muted text-muted-foreground',
  // Follow-up statuses
  'Open': 'bg-secondary/10 text-secondary border-secondary/20',
  'Resolved': 'bg-primary/10 text-primary border-primary/20',
  'Overdue': 'bg-destructive/10 text-destructive border-destructive/20',
  // Activity statuses
  'Planned': 'bg-secondary/10 text-secondary border-secondary/20',
  // Compliance
  'Compliant': 'bg-primary/10 text-primary border-primary/20',
  'Partially Compliant': 'bg-accent/30 text-accent-foreground border-accent/20',
  'Non-Compliant': 'bg-destructive/10 text-destructive border-destructive/20',
  // Acceptance
  'Accepted': 'bg-primary/10 text-primary border-primary/20',
  'Pending': 'bg-accent/30 text-accent-foreground border-accent/20',
  // Risk
  'High': 'bg-destructive/10 text-destructive border-destructive/20',
  'Medium': 'bg-accent/30 text-accent-foreground border-accent/20',
  'Low': 'bg-primary/10 text-primary border-primary/20',
  'Critical': 'bg-destructive/10 text-destructive border-destructive/20',
  // Roles
  'Audit Director': 'bg-secondary/10 text-secondary border-secondary/20',
  'Audit Manager': 'bg-secondary/10 text-secondary border-secondary/20',
  'Auditor': 'bg-primary/10 text-primary border-primary/20',
  'Admin': 'bg-muted text-muted-foreground',
  // Employment status
  'Active': 'bg-primary/10 text-primary border-primary/20',
  'Inactive': 'bg-muted text-muted-foreground',
  // Leave types
  'Annual': 'bg-primary/10 text-primary border-primary/20',
  'Sick': 'bg-accent/30 text-accent-foreground border-accent/20',
  'Training': 'bg-secondary/10 text-secondary border-secondary/20',
  'Other': 'bg-muted text-muted-foreground',
  // Control effectiveness
  'Effective': 'bg-primary/10 text-primary border-primary/20',
  'Partially Effective': 'bg-accent/30 text-accent-foreground border-accent/20',
  'Ineffective': 'bg-destructive/10 text-destructive border-destructive/20',
  // Holidays
  'Public Holiday': 'bg-primary/10 text-primary border-primary/20',
  'Rescheduled': 'bg-secondary/10 text-secondary border-secondary/20',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const colorClass = STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
  return (
    <Badge variant="outline" className={`${colorClass} font-medium ${className}`}>
      {status}
    </Badge>
  );
};
