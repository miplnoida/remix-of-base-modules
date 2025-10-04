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
        "bg-[#F3F4F6] text-[#111827] border border-[#E5E7EB]",
        className
      )}
      role="status"
      aria-label={`Type: ${type}`}
    >
      {type}
    </span>
  );
}
