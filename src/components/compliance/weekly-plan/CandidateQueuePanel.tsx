import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CandidateCard } from './CandidateCard';
import { DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import { PlanCandidate } from '@/types/weeklyPlan';
import { classifyCandidate, UrgencyBucket } from '@/lib/smartDraftEngine';
import {
  AlertTriangle,
  ArrowRight,
  Binoculars,
  Briefcase,
  FileText,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  RotateCcw,
  MapPin,
} from 'lucide-react';

interface CandidateQueuePanelProps {
  candidates: PlanCandidate[];
  addedSourceIds: Set<string | null>;
  onAddToDay: (candidate: PlanCandidate, day: DayOfWeek) => void;
  isLoading: boolean;
  disabled?: boolean;
}

interface BucketConfig {
  key: UrgencyBucket;
  label: string;
  icon: React.ElementType;
  emptyText: string;
}

const BUCKET_CONFIG: BucketConfig[] = [
  { key: 'OVERDUE', label: 'Overdue', icon: AlertTriangle, emptyText: 'No overdue items' },
  { key: 'DUE_THIS_WEEK', label: 'Due This Week', icon: Clock, emptyText: 'No items due this week' },
  { key: 'CARRY_FORWARD', label: 'Carry Forward', icon: RotateCcw, emptyText: 'No carry-forward items' },
  { key: 'ASSIGNED_VIOLATIONS', label: 'Assigned Violations', icon: AlertTriangle, emptyText: 'No assigned violations' },
  { key: 'SCHEDULED_CALLS', label: 'Follow-ups & Calls', icon: ArrowRight, emptyText: 'No follow-up items' },
  { key: 'ZONE_VISITS', label: 'Zone Visits & Cases', icon: MapPin, emptyText: 'No zone visit items' },
  { key: 'SCOUTING_LEADS', label: 'Scouting Leads', icon: Binoculars, emptyText: 'No scouting leads' },
];

export function CandidateQueuePanel({
  candidates,
  addedSourceIds,
  onAddToDay,
  isLoading,
  disabled,
}: CandidateQueuePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openBuckets, setOpenBuckets] = useState<Set<string>>(new Set(['OVERDUE', 'DUE_THIS_WEEK', 'CARRY_FORWARD']));

  const toggleBucket = (key: string) => {
    setOpenBuckets(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(
      c =>
        (c.employer_name || '').toLowerCase().includes(q) ||
        (c.source_ref || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    );
  }, [candidates, searchQuery]);

  // Group by urgency bucket
  const buckets = useMemo(() => {
    const groups: Record<UrgencyBucket, PlanCandidate[]> = {
      OVERDUE: [],
      DUE_THIS_WEEK: [],
      MANDATORY: [],
      CARRY_FORWARD: [],
      ASSIGNED_VIOLATIONS: [],
      SCHEDULED_CALLS: [],
      ZONE_VISITS: [],
      SCOUTING_LEADS: [],
    };
    for (const c of filteredCandidates) {
      const bucket = classifyCandidate(c);
      groups[bucket].push(c);
    }
    // Sort each bucket by recommendation score desc
    for (const key of Object.keys(groups) as UrgencyBucket[]) {
      groups[key].sort((a, b) => (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0));
    }
    return groups;
  }, [filteredCandidates]);

  const totalCount = candidates.length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 space-y-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Suggestions</span>
          <Badge variant="secondary" className="text-xs">{totalCount}</Badge>
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employer, ref..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-340px)] px-3 pb-3">
            <div className="space-y-1">
              {BUCKET_CONFIG.map(config => {
                const items = buckets[config.key];
                const isOpen = openBuckets.has(config.key);
                const unaddedCount = items.filter(c => !addedSourceIds.has(c.source_id)).length;

                return (
                  <Collapsible key={config.key} open={isOpen} onOpenChange={() => toggleBucket(config.key)}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-2 hover:bg-muted/50 rounded-md transition-colors">
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        <config.icon className={`h-3.5 w-3.5 ${config.key === 'OVERDUE' ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-medium">{config.label}</span>
                      </div>
                      <Badge
                        variant={config.key === 'OVERDUE' && unaddedCount > 0 ? 'destructive' : 'outline'}
                        className="text-[10px] h-5"
                      >
                        {unaddedCount}
                      </Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 py-1 pl-6">
                        {items.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground py-2">{config.emptyText}</p>
                        ) : (
                          items.map(c => (
                            <CandidateCard
                              key={c.source_id}
                              candidate={c}
                              isAdded={addedSourceIds.has(c.source_id)}
                              onAddToDay={day => onAddToDay(c, day)}
                              disabled={disabled}
                            />
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
