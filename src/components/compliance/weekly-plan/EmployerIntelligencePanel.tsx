/**
 * EmployerIntelligencePanel
 *
 * Downstream intelligence surfaced after an employer is selected via the
 * Direct or Exception path. Manual selection bypasses the recommendation
 * engine — but it must NOT bypass the planner's awareness of:
 *
 *   - current risk band + audit-priority score (ce_risk_profiles)
 *   - last audit / overdue status
 *   - audit history depth (recent visits + execution status)
 *   - open / scheduled inspections that would conflict with a fresh visit
 *   - validation warnings already surfaced (duplicate / inactive / recent)
 *
 * All data is read-only and live (no mock values). The panel is silent
 * while loading and degrades gracefully when a row isn't found.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  History,
  ShieldAlert,
  TrendingUp,
  Loader2,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { EmployerValidationResult } from '@/hooks/compliance/useEmployerSelectionOrchestrator';

interface Props {
  employerId: string;
  validation?: EmployerValidationResult | null;
}

interface RiskProfileRow {
  risk_band: string | null;
  override_band: string | null;
  total_score: number | null;
  audit_priority_score: number | null;
  audit_priority_band: string | null;
  last_audit_date: string | null;
  next_audit_due_date: string | null;
  overdue_audit_days: number | null;
  consecutive_cycles_skipped: number | null;
  audit_priority_reasons: any;
}

interface InspectionRow {
  id: string;
  status: string;
  scheduled_date: string | null;
  inspection_type: string | null;
  inspector_name: string | null;
  session_started_at: string | null;
  session_closed_at: string | null;
}

function bandTone(band?: string | null): string {
  const b = (band || '').toUpperCase();
  if (b.startsWith('CRIT') || b === 'VERY HIGH' || b === 'HIGH') return 'border-destructive/40 text-destructive';
  if (b === 'MEDIUM' || b === 'MED') return 'border-warning/40 text-warning';
  if (b === 'LOW' || b === 'VERY LOW') return 'border-success/40 text-success';
  return 'border-border text-muted-foreground';
}

export function EmployerIntelligencePanel({ employerId, validation }: Props) {
  const risk = useQuery({
    queryKey: ['employer-risk-profile', employerId],
    enabled: !!employerId,
    staleTime: 60_000,
    queryFn: async (): Promise<RiskProfileRow | null> => {
      const { data } = await (supabase as any)
        .from('ce_risk_profiles')
        .select(
          'risk_band, override_band, total_score, audit_priority_score, audit_priority_band, last_audit_date, next_audit_due_date, overdue_audit_days, consecutive_cycles_skipped, audit_priority_reasons',
        )
        .eq('employer_id', employerId)
        .maybeSingle();
      return data ?? null;
    },
  });

  const inspections = useQuery({
    queryKey: ['employer-inspections-recent', employerId],
    enabled: !!employerId,
    staleTime: 60_000,
    queryFn: async (): Promise<InspectionRow[]> => {
      const { data } = await (supabase as any)
        .from('ce_inspections')
        .select('id, status, scheduled_date, inspection_type, inspector_name, session_started_at, session_closed_at')
        .eq('employer_id', employerId)
        .order('scheduled_date', { ascending: false, nullsFirst: false })
        .limit(8);
      return data ?? [];
    },
  });

  const isLoading = risk.isLoading || inspections.isLoading;

  const openConflicts = (inspections.data ?? []).filter((i) => {
    const s = (i.status || '').toUpperCase();
    return (
      s === 'SCHEDULED' || s === 'IN_PROGRESS' || s === 'PENDING' ||
      (i.session_started_at && !i.session_closed_at)
    );
  });

  const lastCompleted = (inspections.data ?? []).find(
    (i) => (i.status || '').toUpperCase() === 'COMPLETED',
  );

  const effectiveBand = risk.data?.override_band || risk.data?.risk_band;
  const reasons: string[] = Array.isArray(risk.data?.audit_priority_reasons)
    ? risk.data!.audit_priority_reasons.slice(0, 3)
    : typeof risk.data?.audit_priority_reasons === 'string'
    ? [risk.data!.audit_priority_reasons]
    : [];

  return (
    <div className="rounded-md border bg-card p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <Activity className="h-3.5 w-3.5 text-primary" />
        Downstream Intelligence
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      {/* Risk row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <Tile
          icon={<ShieldAlert className="h-3 w-3" />}
          label="Risk Band"
          value={
            effectiveBand ? (
              <Badge variant="outline" className={`text-[10px] ${bandTone(effectiveBand)}`}>
                {effectiveBand}
                {risk.data?.override_band && <span className="ml-1 opacity-70">(override)</span>}
              </Badge>
            ) : (
              <span className="text-muted-foreground">No profile</span>
            )
          }
        />
        <Tile
          icon={<TrendingUp className="h-3 w-3" />}
          label="Audit Priority"
          value={
            risk.data?.audit_priority_score != null ? (
              <span>
                <strong>{risk.data.audit_priority_score}</strong>
                {risk.data?.audit_priority_band && (
                  <span className="ml-1 text-muted-foreground">· {risk.data.audit_priority_band}</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
        <Tile
          icon={<CalendarClock className="h-3 w-3" />}
          label="Last Audit"
          value={
            risk.data?.last_audit_date
              ? new Date(risk.data.last_audit_date).toLocaleDateString()
              : lastCompleted?.scheduled_date
              ? new Date(lastCompleted.scheduled_date).toLocaleDateString()
              : <span className="text-muted-foreground">Never</span>
          }
        />
        <Tile
          icon={<CalendarClock className="h-3 w-3" />}
          label="Next Due"
          value={
            risk.data?.overdue_audit_days && risk.data.overdue_audit_days > 0 ? (
              <span className="text-destructive font-medium">
                Overdue {risk.data.overdue_audit_days}d
              </span>
            ) : risk.data?.next_audit_due_date ? (
              new Date(risk.data.next_audit_due_date).toLocaleDateString()
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      </div>

      {/* Audit history snapshot */}
      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
        <History className="h-3 w-3" />
        <span>
          History: <strong className="text-foreground">{inspections.data?.length ?? 0}</strong>{' '}
          recent inspection{(inspections.data?.length ?? 0) === 1 ? '' : 's'}
          {risk.data?.consecutive_cycles_skipped
            ? ` · ${risk.data.consecutive_cycles_skipped} cycle(s) skipped`
            : ''}
        </span>
      </div>

      {/* Recent inspection rows (compact) */}
      {(inspections.data ?? []).slice(0, 3).map((i) => (
        <div key={i.id} className="text-[11px] flex items-center gap-2 border-l-2 border-border pl-2">
          <Badge variant="outline" className="text-[10px]">{i.status}</Badge>
          {i.inspection_type && <span className="text-muted-foreground">{i.inspection_type}</span>}
          {i.scheduled_date && (
            <span className="text-muted-foreground">
              · {new Date(i.scheduled_date).toLocaleDateString()}
            </span>
          )}
          {i.inspector_name && (
            <span className="text-muted-foreground">· {i.inspector_name}</span>
          )}
        </div>
      ))}

      {/* Conflict alert */}
      {openConflicts.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            <strong>{openConflicts.length}</strong> open or in-progress inspection
            {openConflicts.length === 1 ? '' : 's'} for this employer — adding a fresh
            visit may duplicate effort.
          </AlertDescription>
        </Alert>
      )}

      {/* Top audit-priority reasons (engine intelligence retained) */}
      {reasons.length > 0 && (
        <div className="rounded bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground flex items-start gap-2">
          <Info className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">Why this employer scores up: </span>
            {reasons.join(' · ')}
          </span>
        </div>
      )}

      {/* Validation warnings echoed here for a single-glance summary */}
      {(validation?.warnings.length ?? 0) > 0 && (
        <div className="space-y-1">
          {validation!.warnings.map((w) => (
            <Alert key={w} className="py-1.5 border-warning/30 bg-warning/10">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <AlertDescription className="text-[11px]">{w}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border bg-background p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-xs">{value}</div>
    </div>
  );
}
