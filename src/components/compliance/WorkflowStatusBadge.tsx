/**
 * WorkflowStatusBadge
 *
 * Shows the configured workflow mapping state for a Compliance event on
 * detail screens (violation, case, notice, arrangement, waiver, legal,
 * inspection, rule). Pure presentational — does not start workflows.
 */
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Workflow, ShieldOff } from 'lucide-react';
import { resolveWorkflow, type ComplianceEventKey, type ResolveContext } from '@/services/complianceWorkflowMappingService';

interface Props {
  eventKey: ComplianceEventKey;
  context?: ResolveContext;
  compact?: boolean;
}

export const WorkflowStatusBadge = ({ eventKey, context, compact }: Props) => {
  const { data } = useQuery({
    queryKey: ['ce_wf_resolve', eventKey, context],
    queryFn: () => resolveWorkflow(eventKey, context || {}),
    staleTime: 60_000,
  });

  if (!data) return null;
  if (data.enabled) {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Workflow className="h-3 w-3 text-primary" />
        {compact ? 'Workflow' : `Workflow: ${data.workflowName}`}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-[10px] text-muted-foreground">
      <ShieldOff className="h-3 w-3" />
      Direct ({data.fallbackBehavior})
    </Badge>
  );
};
