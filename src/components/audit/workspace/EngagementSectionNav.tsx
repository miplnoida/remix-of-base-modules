/**
 * IA Phase 5 — stage-grouped navigation for the engagement workspace.
 *
 * Presentation wrapper only: it drives the SAME `?tab=` vocabulary the
 * workspace has always used, so every existing deep link, notification link and
 * bookmark keeps working, and browser back/forward/refresh stay meaningful.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { EngagementWorkspaceTab } from '@/lib/audit/workspaceTabs';
import {
  ENGAGEMENT_STAGE_GROUPS,
  SECTION_LABELS,
  type EngagementStageGroup,
  defaultTabForGroup,
  groupForTab,
  primaryGroupForStage,
  visibleGroups,
} from '@/lib/audit/engagementStages';

export interface SectionCount {
  count?: number;
  tone?: 'default' | 'warning' | 'danger';
}

interface Props {
  activeTab: EngagementWorkspaceTab;
  allowedTabs: readonly string[];
  executionStatus?: string | null;
  counts?: Partial<Record<EngagementWorkspaceTab, SectionCount>>;
  onSelect: (tab: EngagementWorkspaceTab) => void;
}

export function EngagementSectionNav({
  activeTab, allowedTabs, executionStatus, counts = {}, onSelect,
}: Props) {
  const groups = visibleGroups(allowedTabs);
  const stageGroup = primaryGroupForStage(executionStatus);
  const activeGroup: EngagementStageGroup = groupForTab(activeTab, stageGroup);
  const current = groups.find((g) => g.key === activeGroup) ?? groups[0];

  return (
    <div className="space-y-2">
      {/* Stage groups */}
      <div
        role="tablist"
        aria-label="Audit stages"
        className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/40 p-1"
      >
        {groups.map((group) => {
          const isActive = group.key === activeGroup;
          const isStage = group.key === stageGroup;
          return (
            <button
              key={group.key}
              role="tab"
              aria-selected={isActive}
              data-testid={`stage-group-${group.key}`}
              title={group.description}
              onClick={() =>
                onSelect(defaultTabForGroup(group.key, executionStatus, allowedTabs))
              }
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {group.label}
              {isStage && !isActive && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[9px]">
                  Now
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Sections inside the active group */}
      {current && current.tabs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {current.tabs.map((tab) => {
            const isActive = tab === activeTab;
            const meta = counts[tab];
            return (
              <button
                key={tab}
                data-testid={`section-${tab}`}
                onClick={() => onSelect(tab)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {SECTION_LABELS[tab] || tab}
                {!!meta?.count && (
                  <span
                    className={cn(
                      'h-4 min-w-[16px] rounded-full px-1 text-[10px] font-bold leading-4',
                      meta.tone === 'danger'
                        ? 'bg-destructive/10 text-destructive'
                        : meta.tone === 'warning'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {meta.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { ENGAGEMENT_STAGE_GROUPS };
