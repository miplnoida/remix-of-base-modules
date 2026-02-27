import React from 'react';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<string, string> = {
  // Plan statuses
  'Draft': 'bg-muted text-muted-foreground',
  'Submitted': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Approved': 'bg-green-500/10 text-green-700 border-green-200',
  'In Progress': 'bg-orange-500/10 text-orange-700 border-orange-200',
  'Completed': 'bg-purple-500/10 text-purple-700 border-purple-200',
  'Rejected': 'bg-destructive/10 text-destructive border-destructive/20',
  'Cancelled': 'bg-muted text-muted-foreground',
  // Follow-up statuses
  'Open': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Resolved': 'bg-green-500/10 text-green-700 border-green-200',
  'Overdue': 'bg-destructive/10 text-destructive border-destructive/20',
  // Activity statuses
  'Planned': 'bg-blue-500/10 text-blue-700 border-blue-200',
  // Compliance
  'Compliant': 'bg-green-500/10 text-green-700 border-green-200',
  'Partially Compliant': 'bg-orange-500/10 text-orange-700 border-orange-200',
  'Non-Compliant': 'bg-destructive/10 text-destructive border-destructive/20',
  // Acceptance
  'Accepted': 'bg-green-500/10 text-green-700 border-green-200',
  'Pending': 'bg-orange-500/10 text-orange-700 border-orange-200',
  // Risk
  'High': 'bg-destructive/10 text-destructive border-destructive/20',
  'Medium': 'bg-orange-500/10 text-orange-700 border-orange-200',
  'Low': 'bg-green-500/10 text-green-700 border-green-200',
  'Critical': 'bg-destructive/10 text-destructive border-destructive/20',
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
