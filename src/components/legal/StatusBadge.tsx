import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  'Draft': 'bg-gray-900 text-white',
  'Filed': 'bg-blue-700 text-white',
  'Under Review': 'bg-indigo-700 text-white',
  'Hearing Scheduled': 'bg-teal-700 text-white',
  'Hearing Held': 'bg-teal-800 text-white',
  'Decision Pending': 'bg-amber-700 text-white',
  'Order Issued': 'bg-purple-700 text-white',
  'Closed – Compliant': 'bg-green-700 text-white',
  'Closed – Non-Compliant': 'bg-red-700 text-white',
  'Withdrawn': 'bg-zinc-700 text-white',
  'Appealed': 'bg-pink-700 text-white',
  'Reopened': 'bg-indigo-800 text-white',
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
