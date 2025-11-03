import { cn } from "@/lib/utils";

interface TypeBadgeProps {
  type: string;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        "bg-[#1E40AF] text-white border border-[#1D4ED8]",
        className
      )}
      role="status"
      aria-label={`Type: ${type}`}
    >
      {type}
    </span>
  );
}
