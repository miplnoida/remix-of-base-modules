/**
 * ContextualCommActions
 *
 * A small, reusable toolbar of stage-aware "send communication" buttons that
 * lives inside the Audit Visit Workspace tabs (Working Papers, Findings,
 * Report, Completion Gate). Each action:
 *
 *   1. Resolves the best template for the action by:
 *        a. Looking up templates linked to the action's `fieldStage` via the
 *           central `ce_audit_field_stage_template_map` mapping, and
 *        b. Preferring those whose `comm_type` is one of the action's hints.
 *        c. Falling back to any active template matching one of the hints.
 *   2. If exactly one candidate → creates a draft and opens the editor.
 *   3. If multiple candidates → opens a small picker first.
 *   4. If none → toasts a helpful link to the mapping admin.
 *
 * No template content / business logic lives here — purely composer plumbing.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Mail, MessageSquare, Loader2, Send, Settings2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { fieldStageTemplateMapService } from '@/services/fieldStageTemplateMapService';
import { auditCommunicationTemplateService } from '@/services/auditCommunicationTemplateService';
import CommunicationComposer from './CommunicationComposer';
import type { AuditCommunicationTemplate, CeCommType } from '@/types/auditCommunication';
import type { FieldExecutionStage } from '@/types/fieldStageMapping';

export interface ContextualAction {
  /** Stable id for React keys + analytics. */
  key: string;
  /** Button label shown to the user. */
  label: string;
  /** Optional one-liner shown as tooltip / dialog description. */
  description?: string;
  /** Field stage to consult in the mapping table. */
  fieldStage: FieldExecutionStage;
  /**
   * Preferred comm_types for this action, in priority order. Used both to
   * narrow mapped templates and as a fallback search if no mapping exists.
   */
  commTypeHints: CeCommType[];
  /** Optional Lucide icon component. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Visual variant. */
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
}

interface Props {
  inspectionId: string;
  employerId: string;
  employerName?: string;
  userCode?: string;
  actions: ContextualAction[];
  /** Optional title shown above the toolbar. */
  title?: string;
  /** Called after a draft is successfully created or sent. */
  onChanged?: () => void;
  /** Hide the toolbar entirely if no actions resolve to any template. */
  hideIfEmpty?: boolean;
}

interface ResolvedAction extends ContextualAction {
  candidates: AuditCommunicationTemplate[];
}

export function ContextualCommActions({
  inspectionId, employerId, employerName, userCode,
  actions, title, onChanged, hideIfEmpty = false,
}: Props) {
  const [resolved, setResolved] = useState<ResolvedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Picker dialog state (shown when multiple templates match an action).
  const [picker, setPicker] = useState<{ action: ResolvedAction; chosenId: string } | null>(null);

  // Composer dialog state (the existing draft editor).
  const [editingId, setEditingId] = useState<string | null>(null);

  const actionsKey = useMemo(
    () => actions.map((a) => `${a.key}:${a.fieldStage}:${a.commTypeHints.join(',')}`).join('|'),
    [actions],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const out: ResolvedAction[] = [];
      for (const action of actions) {
        let candidates: AuditCommunicationTemplate[] = [];
        try {
          // 1. Mapped templates for this stage.
          const mapped = await fieldStageTemplateMapService.listForStage(action.fieldStage);
          // Narrow to the action's preferred comm_types when possible.
          const narrowed = mapped.filter((t) => action.commTypeHints.includes(t.comm_type));
          candidates = narrowed.length > 0 ? narrowed : mapped;

          // 2. Fallback: any active template of the requested comm_types.
          if (candidates.length === 0) {
            const all = await auditCommunicationTemplateService.list({ activeOnly: true });
            candidates = all.filter((t) => action.commTypeHints.includes(t.comm_type));
          }
        } catch {
          candidates = [];
        }
        // De-dupe by id and order: hint priority first, then template name.
        const byId = new Map<string, AuditCommunicationTemplate>();
        for (const t of candidates) byId.set(t.id, t);
        const ordered = Array.from(byId.values()).sort((a, b) => {
          const ai = action.commTypeHints.indexOf(a.comm_type);
          const bi = action.commTypeHints.indexOf(b.comm_type);
          const aRank = ai === -1 ? 999 : ai;
          const bRank = bi === -1 ? 999 : bi;
          if (aRank !== bRank) return aRank - bRank;
          return a.template_name.localeCompare(b.template_name);
        });
        out.push({ ...action, candidates: ordered });
      }
      if (!cancelled) {
        setResolved(out);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionsKey]);

  const createDraftAndOpen = async (action: ResolvedAction, templateId: string) => {
    setBusyKey(action.key);
    try {
      const created = await auditCommunicationService.createDraft({
        inspectionId,
        employerId,
        templateId,
        contextData: {
          employer_name: employerName || employerId,
          visit_date: new Date().toISOString().slice(0, 10),
          field_stage: action.fieldStage,
          action_key: action.key,
        },
        createdBy: userCode,
      });
      toast.success(`Draft created: ${action.label}`);
      setEditingId(created.id);
      onChanged?.();
    } catch (e: any) {
      toast.error('Could not create draft', { description: e?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const handleClick = async (action: ResolvedAction) => {
    if (action.candidates.length === 0) {
      toast.error(`No template available for "${action.label}"`, {
        description: 'Link one in Field Stage → Template Mapping.',
        action: {
          label: 'Configure',
          onClick: () => window.open('/compliance/admin/field-stage-template-mapping', '_blank'),
        },
      });
      return;
    }
    if (action.candidates.length === 1) {
      await createDraftAndOpen(action, action.candidates[0].id);
      return;
    }
    setPicker({ action, chosenId: action.candidates[0].id });
  };

  const visible = hideIfEmpty
    ? resolved.filter((a) => a.candidates.length > 0)
    : resolved;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading communication actions…
      </div>
    );
  }
  if (visible.length === 0 && hideIfEmpty) return null;

  return (
    <>
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title ?? 'Communications'}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Open a draft using the template mapped to this stage.
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/compliance/admin/field-stage-template-mapping">
              <Settings2 className="h-3 w-3 mr-1" /> Mapping
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {visible.map((action) => {
            const Icon = action.icon ?? Send;
            const disabled = action.candidates.length === 0;
            return (
              <Button
                key={action.key}
                size="sm"
                variant={action.variant ?? 'outline'}
                onClick={() => handleClick(action)}
                disabled={busyKey === action.key}
                title={action.description}
                className="gap-1"
              >
                {busyKey === action.key
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Icon className="h-3.5 w-3.5" />}
                {action.label}
                {disabled ? (
                  <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" /> No template
                  </Badge>
                ) : action.candidates.length > 1 ? (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">
                    {action.candidates.length}
                  </Badge>
                ) : null}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Multi-template picker */}
      <Dialog open={!!picker} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{picker?.action.label}</DialogTitle>
            <DialogDescription>
              {picker?.action.description ?? 'Choose which configured template to use.'}
            </DialogDescription>
          </DialogHeader>
          {picker && (
            <Select
              value={picker.chosenId}
              onValueChange={(v) => setPicker({ ...picker, chosenId: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {picker.action.candidates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      {t.channel === 'email' && <Mail className="h-3 w-3" />}
                      {t.channel === 'sms' && <MessageSquare className="h-3 w-3" />}
                      {t.channel === 'both' && (
                        <>
                          <Mail className="h-3 w-3" />
                          <MessageSquare className="h-3 w-3" />
                        </>
                      )}
                      {t.template_name}
                      <span className="text-xs text-muted-foreground">({t.template_code})</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicker(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!picker) return;
                const action = picker.action;
                const tpl = picker.chosenId;
                setPicker(null);
                await createDraftAndOpen(action, tpl);
              }}
            >
              <Send className="h-3.5 w-3.5 mr-1" /> Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reuse the existing composer for the freshly-created draft */}
      {editingId && (
        <CommunicationDraftEditorDialog
          communicationId={editingId}
          open={!!editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => { setEditingId(null); onChanged?.(); }}
          userCode={userCode}
        />
      )}
    </>
  );
}
