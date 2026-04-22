/**
 * VisitStageSuggestions — stage-aware shortcuts for the Communications tab.
 *
 * Driven by the central `ce_audit_field_stage_template_map` mapping
 * (managed under Settings → Field Stage → Template Mapping):
 *   1. Resolve the visit's current FieldExecutionStage from runtime context.
 *   2. For the current + next adjacent stage, fetch templates linked via
 *      the mapping table.
 *   3. Fallback: if a stage has zero mapped templates, show templates whose
 *      lifecycle_stage matches the stage's lifecycle bucket (zero-config
 *      grace until an admin links one).
 *
 * No comm_type / template logic is hardcoded here.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Plus, Mail, MessageSquare, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import { auditCommunicationService } from '@/services/auditCommunicationService';
import { fieldStageTemplateMapService } from '@/services/fieldStageTemplateMapService';
import type { AuditCommunicationTemplate } from '@/types/auditCommunication';
import {
  FIELD_STAGE_LABELS, FIELD_STAGE_HINTS, FIELD_STAGE_TO_LIFECYCLE,
  type FieldExecutionStage,
} from '@/types/fieldStageMapping';
import {
  resolveFieldStage, adjacentFieldStages,
  type FieldStageContext,
} from '@/lib/compliance/fieldStageResolver';
import type { VisitStageContext } from '@/lib/compliance/visitStageMapping';

interface Props {
  inspectionId: string;
  employerId: string;
  employerName?: string;
  /** Legacy visit context; converted internally to FieldStageContext. */
  visitContext: VisitStageContext;
  userCode?: string;
  onDraftCreated: (communicationId: string) => void;
}

interface StageBucket {
  templates: AuditCommunicationTemplate[];
  fromFallback: boolean;
}

export function VisitStageSuggestions({
  inspectionId, employerId, employerName, visitContext, userCode, onDraftCreated,
}: Props) {
  const [buckets, setBuckets] = useState<Record<string, StageBucket>>({});
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const fieldCtx: FieldStageContext = useMemo(() => ({
    sessionStarted: visitContext.sessionStarted,
    sessionClosed: visitContext.sessionClosed,
    reportStatus: visitContext.reportStatus,
    hasViolations: visitContext.hasViolations,
  }), [visitContext]);

  const currentStage = useMemo(() => resolveFieldStage(fieldCtx), [fieldCtx]);
  const stagesToShow = useMemo(() => adjacentFieldStages(currentStage), [currentStage]);
  const stagesKey = stagesToShow.join('|');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const next: Record<string, StageBucket> = {};
      for (const stage of stagesToShow) {
        try {
          const mapped = await fieldStageTemplateMapService.listForStage(stage);
          if (mapped.length > 0) {
            next[stage] = { templates: mapped, fromFallback: false };
          } else {
            const lifecycle = FIELD_STAGE_TO_LIFECYCLE[stage];
            const fallback = await auditCommunicationTemplateService.list({
              activeOnly: true, lifecycleStage: lifecycle,
            });
            next[stage] = { templates: fallback, fromFallback: true };
          }
        } catch {
          next[stage] = { templates: [], fromFallback: false };
        }
      }
      if (!cancelled) {
        setBuckets(next);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagesKey]);

  const handleQuickCreate = async (template: AuditCommunicationTemplate) => {
    try {
      setCreatingId(template.id);
      const created = await auditCommunicationService.createDraft({
        inspectionId,
        employerId,
        templateId: template.id,
        contextData: {
          employer_name: employerName || employerId,
          visit_date: new Date().toISOString().slice(0, 10),
          field_stage: currentStage,
        },
        createdBy: userCode,
      });
      toast.success(`Draft created: ${template.template_name}`);
      onDraftCreated(created.id);
    } catch (e: any) {
      toast.error('Could not create draft', { description: e?.message });
    } finally {
      setCreatingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading suggestions…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Suggested communications
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Stage:{' '}
              <span className="font-medium text-foreground">
                {FIELD_STAGE_LABELS[currentStage]}
              </span>{' '}
              — {FIELD_STAGE_HINTS[currentStage]}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/compliance/admin/field-stage-template-mapping">
              <Settings2 className="h-3.5 w-3.5 mr-1" /> Manage stage mapping
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stagesToShow.map((stage) => (
          <StageGroup
            key={stage}
            stage={stage}
            bucket={buckets[stage] ?? { templates: [], fromFallback: false }}
            isCurrent={stage === currentStage}
            creatingId={creatingId}
            onCreate={handleQuickCreate}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function StageGroup({
  stage, bucket, isCurrent, creatingId, onCreate,
}: {
  stage: FieldExecutionStage;
  bucket: StageBucket;
  isCurrent: boolean;
  creatingId: string | null;
  onCreate: (t: AuditCommunicationTemplate) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={isCurrent ? 'default' : 'outline'}>
          {FIELD_STAGE_LABELS[stage]}
        </Badge>
        {isCurrent && <span className="text-xs text-primary">Recommended now</span>}
        {bucket.fromFallback && bucket.templates.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            Lifecycle fallback — link templates in admin to override
          </Badge>
        )}
      </div>

      {bucket.templates.length === 0 ? (
        <p className="text-xs text-muted-foreground italic pl-1">
          No templates linked to this stage.{' '}
          <Link to="/compliance/admin/field-stage-template-mapping" className="underline">
            Configure mapping
          </Link>
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {bucket.templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded border bg-card p-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.template_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {t.channel === 'email' && <Mail className="h-3 w-3" />}
                  {t.channel === 'sms' && <MessageSquare className="h-3 w-3" />}
                  {t.channel === 'both' && (
                    <>
                      <Mail className="h-3 w-3" />
                      <MessageSquare className="h-3 w-3" />
                    </>
                  )}
                  <span>{t.send_mode.replace(/_/g, ' ').toLowerCase()}</span>
                  {t.requires_approval_before_send && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1">approval</Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCreate(t)}
                disabled={creatingId === t.id}
              >
                {creatingId === t.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1" />
                )}
                Draft
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
