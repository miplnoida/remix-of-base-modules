import { cn } from "@/lib/utils";

export type StatusVariant = 
  | "pending" 
  | "active" 
  | "draft" 
  | "approved" 
  | "rejected" 
  | "completed" 
  | "overdue" 
  | "at_risk"
  | "within_sla"
  | "filed"
  | "in_progress"
  | "closed"
  | "suspended"
  | "success"
  | "warning"
  | "error"
  | "info";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const statusVariantStyles: Record<StatusVariant, string> = {
  // Primary states
  pending: 'bg-warning text-warning-foreground border border-warning/80',
  active: 'bg-success text-success-foreground border border-success/80',
  draft: 'bg-muted text-muted-foreground border border-border',
  approved: 'bg-success text-success-foreground border border-success/80',
  rejected: 'bg-destructive text-destructive-foreground border border-destructive/80',
  completed: 'bg-success text-success-foreground border border-success/80',
  
  // Risk/SLA states
  overdue: 'bg-destructive text-destructive-foreground border border-destructive/80',
  at_risk: 'bg-destructive text-destructive-foreground border border-destructive/80',
  within_sla: 'bg-success text-success-foreground border border-success/80',
  
  // Legal/Compliance states
  filed: 'bg-warning text-warning-foreground border border-warning/80',
  in_progress: 'bg-info text-info-foreground border border-info/80',
  closed: 'bg-success text-success-foreground border border-success/80',
  suspended: 'bg-muted text-muted-foreground border border-border',
  
  // Generic states
  success: 'bg-success text-success-foreground border border-success/80',
  warning: 'bg-warning text-warning-foreground border border-warning/80',
  error: 'bg-destructive text-destructive-foreground border border-destructive/80',
  info: 'bg-info text-info-foreground border border-info/80',
};

// Auto-detect variant from status text
function detectVariant(status: string): StatusVariant {
  const statusLower = status.toLowerCase().replace(/[_\s-]/g, '');
  
  // Pending variants
  if (statusLower.includes('pending') || statusLower.includes('draft') || statusLower.includes('review')) {
    return 'pending';
  }
  
  // Active/Approved variants
  if (statusLower.includes('active') || statusLower.includes('approved') || statusLower.includes('registered')) {
    return 'active';
  }
  
  // Completed/Closed variants
  if (statusLower.includes('completed') || statusLower.includes('closed') || statusLower.includes('compliant')) {
    return 'completed';
  }
  
  // Rejected/Failed variants
  if (statusLower.includes('rejected') || statusLower.includes('failed') || statusLower.includes('noncompliant')) {
    return 'rejected';
  }
  
  // Overdue variants
  if (statusLower.includes('overdue') || statusLower.includes('late')) {
    return 'overdue';
  }
  
  // At Risk variants
  if (statusLower.includes('atrisk') || statusLower.includes('risk')) {
    return 'at_risk';
  }
  
  // Filed variants
  if (statusLower.includes('filed')) {
    return 'filed';
  }
  
  // In Progress variants
  if (statusLower.includes('progress') || statusLower.includes('processing') || statusLower.includes('hearing')) {
    return 'in_progress';
  }
  
  // Suspended variants
  if (statusLower.includes('suspended') || statusLower.includes('inactive')) {
    return 'suspended';
  }
  
  // Default to info
  return 'info';
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const detectedVariant = variant || detectVariant(status);
  const styles = statusVariantStyles[detectedVariant];
  
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
