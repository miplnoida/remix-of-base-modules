import React from "react";
import { cn } from "@/lib/utils";
import { FileSearch } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  title = "No records found",
  description = "Try adjusting your search or filters.",
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 border rounded-lg bg-background", className)}>
      <div className="mb-3 rounded-full bg-muted p-3">
        <FileSearch className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
