import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useFieldHelp, KBFieldHelp } from '@/hooks/useFieldHelp';

interface FieldHelpProps {
  moduleKey: string;
  screenKey: string;
  fieldKey: string;
  children: React.ReactNode;
}

const SOURCE_COLORS: Record<string, string> = {
  database: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  c3_config: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  derived: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  manual_entry: 'bg-muted text-muted-foreground',
  system_calculated: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  external_api: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
};

function FieldHelpDetail({ field }: { field: KBFieldHelp }) {
  return (
    <div className="space-y-4">
      {field.source_type && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Source</span>
          <div className="mt-1">
            <Badge variant="outline" className={SOURCE_COLORS[field.source_type] || ''}>
              {field.source_type.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
      )}

      {field.full_help && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Details</span>
          <p className="mt-1 text-sm whitespace-pre-wrap">{field.full_help}</p>
        </div>
      )}

      {field.example_value && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Example</span>
          <p className="mt-1 text-sm font-mono bg-muted rounded px-2 py-1">{field.example_value}</p>
        </div>
      )}

      {field.impact_of_change && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Impact of Change</span>
          <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">{field.impact_of_change}</p>
        </div>
      )}

      {field.related_rules && field.related_rules.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Related Rules</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {field.related_rules.map(rule => (
              <Badge key={rule} variant="secondary" className="text-xs">{rule}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FieldHelp({ moduleKey, screenKey, fieldKey, children }: FieldHelpProps) {
  const { getFieldHelp } = useFieldHelp(moduleKey, screenKey);
  const [detailOpen, setDetailOpen] = useState(false);

  const field = getFieldHelp(fieldKey);

  if (!field) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {children}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => field.full_help && setDetailOpen(true)}
                className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                aria-label={`Help for ${field.field_label}`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{field.short_help}</p>
              {field.full_help && (
                <p className="text-xs text-muted-foreground mt-1 underline cursor-pointer" onClick={() => setDetailOpen(true)}>
                  Learn more
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="w-[400px] sm:max-w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">{field.field_label}</SheetTitle>
            <SheetDescription>{field.short_help}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <FieldHelpDetail field={field} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
