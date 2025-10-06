import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  'Draft': 'bg-[#111827] text-white border border-[#1f2937]',
  'Filed': 'bg-[#1D4ED8] text-white border border-[#1E40AF]',
  'Pending Hearing': 'bg-[#0F766E] text-white border border-[#0D9488]',
  'In Court': 'bg-[#115E59] text-white border border-[#134E4A]',
  'Judgment Delivered': 'bg-[#B45309] text-white border border-[#C2410C]',
  'Enforcement Ongoing': 'bg-[#6D28D9] text-white border border-[#7C3AED]',
  'Closed – Compliant': 'bg-[#166534] text-white border border-[#15803D]',
  'Closed – Non-Compliant': 'bg-[#B91C1C] text-white border border-[#DC2626]',
  'Settled': 'bg-[#047857] text-white border border-[#059669]',
  'Withdrawn': 'bg-[#3F3F46] text-white border border-[#52525B]',
  'On Appeal': 'bg-[#9D174D] text-white border border-[#BE185D]',
  'Reopened': 'bg-[#3730A3] text-white border border-[#4338CA]',
  // Legacy statuses for backward compatibility
  'Under Review': 'bg-[#4338CA] text-white border border-[#3730A3]',
  'Hearing Scheduled': 'bg-[#0F766E] text-white border border-[#0D9488]',
  'Hearing Held': 'bg-[#115E59] text-white border border-[#134E4A]',
  'Decision Pending': 'bg-[#B45309] text-white border border-[#C2410C]',
  'Order Issued': 'bg-[#6D28D9] text-white border border-[#7C3AED]',
  'Appealed': 'bg-[#9D174D] text-white border border-[#BE185D]',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = statusStyles[status] || 'bg-gray-700 text-white';
  
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
