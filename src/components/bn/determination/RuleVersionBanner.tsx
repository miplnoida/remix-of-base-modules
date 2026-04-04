import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Info, BookOpen, Calendar } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { BnProductVersion } from '@/types/bn';

interface Props {
  version: BnProductVersion | null;
  ruleCount?: { eligibility: number; calculation: number; timeline: number };
}

export const RuleVersionBanner: React.FC<Props> = ({ version, ruleCount }) => {
  if (!version) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          <span className="text-sm">No product version assigned — rules cannot be evaluated.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Rule Version {version.version_number}</span>
          <Badge variant={version.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
            {version.status}
          </Badge>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDateForDisplay(version.effective_from)}
            {version.effective_to ? ` – ${formatDateForDisplay(version.effective_to)}` : ' – Present'}
          </span>
        </div>

        {ruleCount && (
          <div className="ml-auto flex gap-3 text-xs text-muted-foreground">
            <span>{ruleCount.eligibility} eligibility rules</span>
            <span>{ruleCount.calculation} calc rules</span>
            <span>{ruleCount.timeline} timeline rules</span>
          </div>
        )}
      </div>
    </div>
  );
};
