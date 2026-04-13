import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CandidateCard } from './CandidateCard';
import { GroupedCandidates, DayOfWeek } from '@/hooks/useWeeklyPlanBuilder';
import { PlanCandidate } from '@/types/weeklyPlan';
import {
  AlertTriangle,
  ArrowRight,
  Binoculars,
  Briefcase,
  FileText,
  Search,
  Loader2,
} from 'lucide-react';

interface CandidateQueuePanelProps {
  groupedCandidates: GroupedCandidates;
  addedSourceIds: Set<string | null>;
  onAddToDay: (candidate: PlanCandidate, day: DayOfWeek) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const SOURCE_TABS = [
  { key: 'VIOLATION' as const, label: 'Violations', icon: AlertTriangle },
  { key: 'FOLLOW_UP' as const, label: 'Follow-ups', icon: ArrowRight },
  { key: 'SCOUTING_LEAD' as const, label: 'Scouting', icon: Binoculars },
  { key: 'CASE' as const, label: 'Cases', icon: Briefcase },
  { key: 'NOTICE' as const, label: 'Notices', icon: FileText },
];

export function CandidateQueuePanel({
  groupedCandidates,
  addedSourceIds,
  onAddToDay,
  isLoading,
  disabled,
}: CandidateQueuePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('VIOLATION');

  const filterCandidates = (items: PlanCandidate[]) => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      c =>
        (c.employer_name || '').toLowerCase().includes(q) ||
        (c.source_ref || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    );
  };

  const totalCount = Object.values(groupedCandidates).reduce((s, arr) => s + arr.length, 0);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 space-y-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Candidate Queue</span>
          <Badge variant="secondary" className="text-xs">{totalCount} items</Badge>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-3 mb-2 grid grid-cols-5 h-auto">
            {SOURCE_TABS.map(tab => {
              const count = groupedCandidates[tab.key].length;
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="text-xs flex-col gap-0.5 py-1.5 px-1"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{count}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            SOURCE_TABS.map(tab => {
              const filtered = filterCandidates(groupedCandidates[tab.key]);
              return (
                <TabsContent key={tab.key} value={tab.key} className="flex-1 min-h-0 mt-0">
                  <ScrollArea className="h-[calc(100vh-380px)] px-3 pb-3">
                    {filtered.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No {tab.label.toLowerCase()} candidates
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filtered.map(c => (
                          <CandidateCard
                            key={c.source_id}
                            candidate={c}
                            isAdded={addedSourceIds.has(c.source_id)}
                            onAddToDay={day => onAddToDay(c, day)}
                            disabled={disabled}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              );
            })
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
