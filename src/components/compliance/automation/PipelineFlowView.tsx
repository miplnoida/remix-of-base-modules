import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ShieldAlert, ArrowDown } from 'lucide-react';
import type { AutomationJob } from '@/types/automationJob';

interface PipelineFlowViewProps {
  jobs: AutomationJob[];
  onJobClick: (job: AutomationJob) => void;
}

const PHASES = [
  { phase: 1, label: 'Sync', color: 'border-blue-500/30 bg-blue-500/5' },
  { phase: 2, label: 'Refresh', color: 'border-cyan-500/30 bg-cyan-500/5' },
  { phase: 3, label: 'Detection', color: 'border-amber-500/30 bg-amber-500/5' },
  { phase: 4, label: 'Financial', color: 'border-emerald-500/30 bg-emerald-500/5' },
  { phase: 5, label: 'Risk & Escalation', color: 'border-purple-500/30 bg-purple-500/5' },
  { phase: 6, label: 'Operational', color: 'border-slate-500/30 bg-slate-500/5' },
];

const ReadinessIcon = ({ job }: { job: AutomationJob }) => {
  const params = job.parameters || {};
  if (params.status === 'DEPRECATED') return <ShieldAlert className="h-3 w-3 text-muted-foreground" />;
  if (job.is_enabled && params.has_runtime) return <CheckCircle className="h-3 w-3 text-success" />;
  if (params.has_runtime) return <CheckCircle className="h-3 w-3 text-primary/50" />;
  return <XCircle className="h-3 w-3 text-destructive/50" />;
};

export const PipelineFlowView: React.FC<PipelineFlowViewProps> = ({ jobs, onJobClick }) => {
  const nonDeprecated = jobs.filter(j => j.parameters?.status !== 'DEPRECATED');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Compliance Pipeline Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {PHASES.map((phase, pi) => {
            const phaseJobs = nonDeprecated.filter(j => j.parameters?.pipeline_phase === phase.phase);
            if (phaseJobs.length === 0) return null;

            return (
              <React.Fragment key={phase.phase}>
                {pi > 0 && (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className={`rounded-lg border p-3 ${phase.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] font-medium">P{phase.phase}</Badge>
                    <span className="text-xs font-medium text-foreground">{phase.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {phaseJobs.map(job => {
                      const params = job.parameters || {};
                      const deps = (params.depends_on || []) as string[];
                      return (
                        <button
                          key={job.id}
                          onClick={() => onJobClick(job)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded border bg-background hover:bg-accent/50 transition-colors text-left"
                        >
                          <ReadinessIcon job={job} />
                          <div>
                            <p className="text-xs font-medium text-foreground leading-tight">{job.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{job.job_code}</p>
                          </div>
                          {deps.length > 0 && (
                            <Badge variant="outline" className="text-[9px] ml-1">
                              ← {deps.length}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
