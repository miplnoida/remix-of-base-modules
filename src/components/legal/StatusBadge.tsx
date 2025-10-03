import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  'Draft': 'bg-gray-900 text-white border border-gray-800',
  'Filed': 'bg-blue-700 text-white border border-blue-600',
  'Under Review': 'bg-indigo-700 text-white border border-indigo-600',
  'Hearing Scheduled': 'bg-teal-700 text-white border border-teal-600',
  'Hearing Held': 'bg-teal-800 text-white border border-teal-700',
  'Decision Pending': 'bg-amber-700 text-white border border-amber-600',
  'Order Issued': 'bg-purple-700 text-white border border-purple-600',
  'Closed – Compliant': 'bg-green-700 text-white border border-green-600',
  'Closed – Non-Compliant': 'bg-red-700 text-white border border-red-600',
  'Withdrawn': 'bg-zinc-700 text-white border border-zinc-600',
  'Appealed': 'bg-pink-700 text-white border border-pink-600',
  'Reopened': 'bg-indigo-800 text-white border border-indigo-700',
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
