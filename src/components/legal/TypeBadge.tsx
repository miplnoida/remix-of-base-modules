import { cn } from "@/lib/utils";

interface TypeBadgeProps {
  type: string;
  className?: string;
}

export function TypeBadge({ type, className }: TypeBadgeProps) {
  return (
    <span 
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
        "bg-gray-100 text-gray-900 border border-gray-300",
        className
      )}
    >
      {type}
    </span>
  );
}
