/**
 * VisitStageSuggestions — stage-aware shortcuts for the visit Communications tab.
 *
 * Reads the same `ce_audit_communication_templates` configured in Settings,
 * filters them by `lifecycle_stage` matching the current visit stage (and the
 * next logical stage), and lets the inspector create a draft in one click.
 *
 * No new template config — pure consumer of the existing admin-managed setup.
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
import type { AuditCommunicationTemplate, CeCommLifecycleStage } from '@/types/auditCommunication';
import { COMM_LIFECYCLE_STAGE_LABELS, COMM_LIFECYCLE_STAGE_HINTS } from '@/types/auditCommunication';
import {
  resolveVisitStage,
  suggestedStages,
  VISIT_STAGE_LABELS,
  VISIT_STAGE_HINTS,
  type VisitStageContext,
} from '@/lib/compliance/visitStageMapping';

interface Props {
  inspectionId: string;
  employerId: string;
  employerName?: string;
  visitContext: VisitStageContext;
  userCode?: string;
  onDraftCreated: (communicationId: string) => void;
}

export function VisitStageSuggestions({
  inspectionId,
  employerId,
  employerName,
  visitContext,
  userCode,
  onDraftCreated,
}: Props) {
  const [templates, setTemplates] = useState<AuditCommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  const currentStage = useMemo(() => resolveVisitStage(visitContext), [visitContext]);
  const stagesToShow = useMemo(() => suggestedStages(currentStage), [currentStage]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    auditCommunicationTemplateService
      .list({ activeOnly: true })
      .then((rows) => {
        if (mounted) setTemplates(rows);
      })
      .catch((e) => toast.error('Failed to load templates', { description: e?.message }))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, AuditCommunicationTemplate[]> = {};
    for (const stage of stagesToShow) {
      map[stage] = templates.filter((t) => (t.lifecycle_stage ?? null) === stage);
    }
    return map;
  }, [templates, stagesToShow]);

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
                {VISIT_STAGE_LABELS[currentStage]}
              </span>{' '}
              — {VISIT_STAGE_HINTS[currentStage]}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/compliance/admin/audit-communication-templates">
              <Settings2 className="h-3.5 w-3.5 mr-1" /> Manage templates
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stagesToShow.map((stage) => (
          <StageGroup
            key={stage}
            stage={stage}
            templates={grouped[stage] ?? []}
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
  stage,
  templates,
  isCurrent,
  creatingId,
  onCreate,
}: {
  stage: CeCommLifecycleStage;
  templates: AuditCommunicationTemplate[];
  isCurrent: boolean;
  creatingId: string | null;
  onCreate: (t: AuditCommunicationTemplate) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={isCurrent ? 'default' : 'outline'}>
          {COMM_LIFECYCLE_STAGE_LABELS[stage]}
        </Badge>
        {isCurrent && <span className="text-xs text-primary">Recommended now</span>}
        <span className="text-xs text-muted-foreground hidden md:inline">
          {COMM_LIFECYCLE_STAGE_HINTS[stage]}
        </span>
      </div>

      {templates.length === 0 ? (
        <p className="text-xs text-muted-foreground italic pl-1">
          No templates configured for this stage.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {templates.map((t) => (
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
                    <Badge variant="outline" className="text-[10px] py-0 px-1">
                      approval
                    </Badge>
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
