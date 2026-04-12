import React, { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, X, Search, ArrowRight, Archive, ShieldAlert } from 'lucide-react';
import { detectCircularDeps, detectScheduleConflicts, type ScheduleWarning } from '@/lib/cronUtils';
import type { AutomationJob } from '@/types/automationJob';

interface DependencyPickerProps {
  jobCode: string;
  selectedDeps: string[];
  onDepsChange: (deps: string[]) => void;
  cronExpression: string;
  allJobs: AutomationJob[];
  disabled?: boolean;
}

export const DependencyPicker: React.FC<DependencyPickerProps> = ({
  jobCode, selectedDeps, onDepsChange, cronExpression, allJobs, disabled,
}) => {
  const [search, setSearch] = useState('');

  // Available jobs for selection (exclude self, deprecated by default shown with warning)
  const availableJobs = useMemo(() => {
    return allJobs
      .filter(j => j.job_code !== jobCode)
      .sort((a, b) => (a.parameters?.pipeline_phase ?? 99) - (b.parameters?.pipeline_phase ?? 99));
  }, [allJobs, jobCode]);

  const filteredJobs = useMemo(() => {
    if (!search) return availableJobs;
    const q = search.toLowerCase();
    return availableJobs.filter(j =>
      j.job_code.toLowerCase().includes(q) || j.name.toLowerCase().includes(q)
    );
  }, [availableJobs, search]);

  // Warnings
  const warnings = useMemo(() => {
    const w: ScheduleWarning[] = [];
    // Circular detection
    const circular = detectCircularDeps(jobCode, selectedDeps, allJobs);
    if (circular) w.push({ type: 'circular', message: `Circular dependency detected` });
    // Schedule conflicts
    w.push(...detectScheduleConflicts(jobCode, cronExpression, selectedDeps, allJobs));
    return w;
  }, [jobCode, selectedDeps, cronExpression, allJobs]);

  // Downstream jobs (read-only)
  const downstreamJobs = useMemo(() => {
    return allJobs.filter(j => {
      const deps = (j.parameters?.depends_on || []) as string[];
      return deps.includes(jobCode);
    });
  }, [allJobs, jobCode]);

  const toggleDep = (code: string) => {
    if (disabled) return;
    // Prevent circular
    const next = selectedDeps.includes(code)
      ? selectedDeps.filter(d => d !== code)
      : [...selectedDeps, code];

    if (!selectedDeps.includes(code)) {
      const circular = detectCircularDeps(jobCode, next, allJobs);
      if (circular) {
        return; // silently block
      }
    }
    onDepsChange(next);
  };

  const removeDep = (code: string) => {
    if (disabled) return;
    onDepsChange(selectedDeps.filter(d => d !== code));
  };

  return (
    <div className="space-y-4">
      {/* Selected chips */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Depends On</Label>
        <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-md border bg-background">
          {selectedDeps.length === 0 && (
            <span className="text-xs text-muted-foreground">No dependencies selected</span>
          )}
          {selectedDeps.map(code => {
            const j = allJobs.find(x => x.job_code === code);
            const isDeprecated = j?.parameters?.status === 'DEPRECATED';
            const noRuntime = !j?.parameters?.has_runtime;
            return (
              <Badge
                key={code}
                variant={isDeprecated ? 'outline' : 'secondary'}
                className={`gap-1 text-xs ${isDeprecated ? 'border-dashed opacity-60' : ''}`}
              >
                {isDeprecated && <Archive className="h-3 w-3" />}
                {noRuntime && !isDeprecated && <ShieldAlert className="h-3 w-3 text-destructive" />}
                {code}
                {!disabled && (
                  <button onClick={() => removeDep(code)} className="ml-0.5 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded p-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Job picker */}
      {!disabled && (
        <div className="rounded-md border">
          <div className="flex items-center border-b px-3 py-1.5">
            <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="border-0 h-8 text-xs focus-visible:ring-0 shadow-none px-0"
            />
          </div>
          <ScrollArea className="max-h-[200px]">
            <div className="p-1">
              {filteredJobs.map(j => {
                const params = j.parameters || {};
                const isDeprecated = params.status === 'DEPRECATED';
                const isSelected = selectedDeps.includes(j.job_code);
                return (
                  <label
                    key={j.job_code}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs cursor-pointer hover:bg-muted/50 transition-colors ${isDeprecated ? 'opacity-50' : ''}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleDep(j.job_code)}
                    />
                    <span className="font-mono text-muted-foreground">{j.job_code}</span>
                    <span className="truncate">{j.name}</span>
                    {params.pipeline_phase && (
                      <Badge variant="outline" className="text-[9px] ml-auto shrink-0">P{params.pipeline_phase}</Badge>
                    )}
                    {isDeprecated && <Badge variant="outline" className="text-[9px] border-dashed">Deprecated</Badge>}
                    {!params.has_runtime && !isDeprecated && (
                      <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30">No Runtime</Badge>
                    )}
                  </label>
                );
              })}
              {filteredJobs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No matching jobs</p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Downstream (read-only) */}
      {downstreamJobs.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Downstream Jobs (depend on this job)</Label>
          <div className="flex flex-wrap gap-1.5">
            {downstreamJobs.map(j => (
              <Badge key={j.job_code} variant="outline" className="text-xs gap-1">
                <ArrowRight className="h-3 w-3" /> {j.job_code}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
