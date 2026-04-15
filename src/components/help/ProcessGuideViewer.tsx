import React from 'react';
import { CheckCircle2, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { KBProcessGuide } from '@/hooks/useScreenHelp';

interface ProcessGuideViewerProps {
  guide: KBProcessGuide;
}

export function ProcessGuideViewer({ guide }: ProcessGuideViewerProps) {
  const steps = Array.isArray(guide.steps) ? guide.steps : [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{guide.process_name}</h3>
        {guide.trigger_description && (
          <p className="text-sm text-muted-foreground mt-1">{guide.trigger_description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {guide.estimated_duration && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {guide.estimated_duration}
          </span>
        )}
        {guide.roles_involved && guide.roles_involved.length > 0 && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {guide.roles_involved.join(', ')}
          </span>
        )}
      </div>

      {guide.prerequisites && guide.prerequisites.length > 0 && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Prerequisites</span>
          <ul className="mt-1 space-y-0.5">
            {guide.prerequisites.map((p, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span> {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        {steps.map((step: any, index: number) => (
          <div key={step.step_number || index} className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              {step.step_number || index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{step.title}</span>
                {step.role && (
                  <Badge variant="outline" className="text-[10px]">{step.role}</Badge>
                )}
              </div>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {guide.expected_outcome && (
        <>
          <Separator />
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs font-medium">Expected Outcome</span>
              <p className="text-xs text-muted-foreground">{guide.expected_outcome}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
