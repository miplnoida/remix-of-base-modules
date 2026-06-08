import { Badge } from '@/components/ui/badge';
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfidenceStatus = 'CONFIRMED' | 'NEEDS_LEGAL_CONFIRMATION' | 'DRAFT' | null | undefined;

/**
 * Legal Confirmation badge — surfaces the confidence_status of a rule
 * (catalogue or product). Use everywhere a rule threshold is shown so
 * provisional/unconfirmed legal items are visually obvious.
 */
export function LegalConfidenceBadge({
  status,
  className,
}: {
  status: ConfidenceStatus;
  className?: string;
}) {
  if (status === 'CONFIRMED') {
    return (
      <Badge variant="outline" className={cn('gap-1 border-emerald-500 text-emerald-700', className)}>
        <ShieldCheck className="h-3 w-3" /> Legal Confirmed
      </Badge>
    );
  }
  if (status === 'NEEDS_LEGAL_CONFIRMATION') {
    return (
      <Badge variant="outline" className={cn('gap-1 border-amber-500 text-amber-700', className)}>
        <ShieldAlert className="h-3 w-3" /> Legal Confirmation Required
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn('gap-1 text-muted-foreground', className)}>
      <ShieldQuestion className="h-3 w-3" /> Draft
    </Badge>
  );
}
