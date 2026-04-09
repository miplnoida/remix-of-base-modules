import React from 'react';
import { Lock, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Badge that marks a setting as inherited from Foundation.
 * Used in template editors to visually indicate locked/read-only formatting.
 */
export function InheritedBadge({ label = 'Inherited from Foundation' }: { label?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-[10px] h-5 gap-1 font-normal text-muted-foreground border-muted-foreground/30 cursor-default select-none"
          >
            <Lock className="h-2.5 w-2.5" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          This setting is controlled in the <strong>Foundation</strong> tab and applies to all documents.
          It cannot be overridden per template.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * A read-only summary card showing Foundation-inherited settings
 * inside a template editor. Shows the actual values with lock indicators.
 */
export function FoundationInheritedSummary({
  items,
  sectionTitle,
}: {
  sectionTitle: string;
  items: { label: string; value: string | React.ReactNode }[];
}) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {sectionTitle}
        </span>
        <InheritedBadge />
      </div>
      <div className="grid gap-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground/80">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
