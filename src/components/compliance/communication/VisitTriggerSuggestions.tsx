/**
 * VisitTriggerSuggestions
 *
 * Slim banner shown inside the visit Communications tab (and gate panel)
 * that surfaces decisions emitted by the configurable trigger engine:
 *
 *  - SUGGEST    → "Create draft" button per decision
 *  - AUTO_*     → grouped "Run auto actions" button
 *  - skipped    → collapsed list (cooldown / cap reached) for transparency
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, Sparkles, Bot, Send, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useVisitTriggerEvaluation } from '@/hooks/useVisitTriggerEvaluation';
import { FIELD_STAGE_LABELS } from '@/types/fieldStageMapping';
import type { TriggerContext } from '@/types/commTriggerRule';
import type { CommTriggerRule } from '@/types/commTriggerRule';

interface Props {
  inspectionId: string;
  employerId: string;
  employerName?: string;
  visitContext: Omit<TriggerContext, 'existingByType'>;
  userCode?: string;
  onCreated?: (communicationId: string) => void;
}

export function VisitTriggerSuggestions({
  inspectionId, employerId, employerName, visitContext, userCode, onCreated,
}: Props) {
  const {
    suggestions, autoActions, skipped, loading, error, refresh, act, runAuto,
  } = useVisitTriggerEvaluation({
    inspectionId, employerId, employerName, visitContext, userCode,
  });

  const [busyRule, setBusyRule] = useState<string | null>(null);
  const [runningAuto, setRunningAuto] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);

  const handleAct = async (rule: CommTriggerRule) => {
    setBusyRule(rule.id);
    const result = await act(rule);
    setBusyRule(null);
    if (result.status === 'sent') {
      toast.success(`${rule.rule_name}: sent`);
    } else if (result.status === 'created') {
      toast.success(`${rule.rule_name}: draft created${result.message ? ` (${result.message})` : ''}`);
      if (result.communicationId) onCreated?.(result.communicationId);
    } else if (result.status === 'skipped') {
      toast.info(result.message || 'Skipped');
    } else {
      toast.error(result.message || 'Failed');
    }
    refresh();
  };

  const handleRunAuto = async () => {
    setRunningAuto(true);
    const results = await runAuto();
    setRunningAuto(false);
    const sent = results.filter((r) => r.status === 'sent').length;
    const created = results.filter((r) => r.status === 'created').length;
    const failed = results.filter((r) => r.status === 'failed' || r.status === 'skipped').length;
    if (sent || created) toast.success(`Auto actions: ${sent} sent, ${created} drafted${failed ? `, ${failed} skipped` : ''}`);
    else if (failed) toast.error(`All ${failed} auto action(s) skipped`);
    refresh();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Evaluating communication triggers…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-3 text-xs text-destructive">
          Trigger engine error: {error}
        </CardContent>
      </Card>
    );
  }

  const hasAnything = suggestions.length + autoActions.length + skipped.length > 0;
  if (!hasAnything) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Communication trigger engine
              <Badge variant="secondary" className="ml-1 h-5 text-[10px]">
                {suggestions.length + autoActions.length} active
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {autoActions.length > 0 && (
                <Button size="sm" onClick={handleRunAuto} disabled={runningAuto} className="gap-1">
                  {runningAuto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                  Run auto actions ({autoActions.length})
                </Button>
              )}
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                <Link to="/compliance/admin/comm-trigger-rules">
                  <Settings2 className="h-3 w-3 mr-1" /> Rules
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* SUGGESTIONS */}
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Suggested
              </div>
              {suggestions.map((d) => (
                <div key={d.rule.id}
                     className="flex items-start justify-between gap-2 rounded border bg-muted/30 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      {d.rule.rule_name}
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {FIELD_STAGE_LABELS[d.rule.field_stage] || d.rule.field_stage}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {d.rule.comm_type}
                      </Badge>
                    </div>
                    {d.rule.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{d.rule.description}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAct(d.rule)}
                    disabled={busyRule === d.rule.id}
                    className="shrink-0 gap-1"
                  >
                    {busyRule === d.rule.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Send className="h-3.5 w-3.5" />}
                    Create draft
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* AUTO actions list — informational; the top-right button runs them */}
          {autoActions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Auto-triggered
              </div>
              {autoActions.map((d) => (
                <div key={d.rule.id}
                     className="flex items-start justify-between gap-2 rounded border border-primary/20 bg-primary/5 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      {d.rule.rule_name}
                      <Badge variant="default" className="text-[9px] h-4 px-1">
                        {d.rule.trigger_mode === 'AUTO_SEND' ? 'AUTO SEND' : 'AUTO DRAFT'}
                      </Badge>
                    </div>
                    {d.rule.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{d.rule.description}</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAct(d.rule)}
                    disabled={busyRule === d.rule.id}
                    className="shrink-0 gap-1"
                  >
                    {busyRule === d.rule.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Bot className="h-3.5 w-3.5" />}
                    Run now
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* SKIPPED — collapsible */}
          {skipped.length > 0 && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground"
                onClick={() => setShowSkipped((v) => !v)}
              >
                {showSkipped ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {skipped.length} rule(s) skipped (cooldown / cap)
              </Button>
              {showSkipped && (
                <ul className="mt-1 space-y-1">
                  {skipped.map((d) => (
                    <li key={d.rule.id} className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="underline decoration-dotted cursor-help">{d.rule.rule_name}</span>
                        </TooltipTrigger>
                        <TooltipContent>{d.skipReason || 'Skipped'}</TooltipContent>
                      </Tooltip>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{d.rule.comm_type}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
