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
  pending: 'bg-[#F59E0B] text-white border border-[#D97706]',
  active: 'bg-[#16A34A] text-white border border-[#15803D]',
  draft: 'bg-[#6B7280] text-white border border-[#4B5563]',
  approved: 'bg-[#16A34A] text-white border border-[#15803D]',
  rejected: 'bg-[#DC2626] text-white border border-[#B91C1C]',
  completed: 'bg-[#047857] text-white border border-[#059669]',
  
  // Risk/SLA states
  overdue: 'bg-[#B91C1C] text-white border border-[#DC2626]',
  at_risk: 'bg-[#DC2626] text-white border border-[#B91C1C]',
  within_sla: 'bg-[#047857] text-white border border-[#059669]',
  
  // Legal/Compliance states
  filed: 'bg-[#B45309] text-white border border-[#C2410C]',
  in_progress: 'bg-[#0F766E] text-white border border-[#0D9488]',
  closed: 'bg-[#166534] text-white border border-[#15803D]',
  suspended: 'bg-[#3F3F46] text-white border border-[#52525B]',
  
  // Generic states
  success: 'bg-[#16A34A] text-white border border-[#15803D]',
  warning: 'bg-[#F59E0B] text-white border border-[#D97706]',
  error: 'bg-[#DC2626] text-white border border-[#B91C1C]',
  info: 'bg-[#0EA5E9] text-white border border-[#0284C7]',
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
