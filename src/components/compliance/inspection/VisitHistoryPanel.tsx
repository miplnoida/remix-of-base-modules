/**
 * VisitHistoryPanel
 *
 * Shows ALL inspections for an employer (past + current) so the inspector
 * can see prior visits, dates, status, evidence/findings/violations counts,
 * and jump to any of them. Supports the "multiple visits before report" model.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, MapPin, User, FileSearch, AlertTriangle, Camera, ClipboardCheck } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';

interface VisitRow {
  id: string;
  inspection_number: string | null;
  status: string | null;
  scheduled_date: string | null;
  actual_start: string | null;
  actual_end: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  inspector_name: string | null;
  location_address: string | null;
  evidenceCount: number;
  findingsCount: number;
  violationsCount: number;
}

interface Props {
  employerId: string;
  currentVisitId?: string;
  onSelectVisit?: (visitId: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: 'bg-warning/10 text-warning border-warning/20',
  COMPLETED: 'bg-success/10 text-success border-success/20',
  SCHEDULED: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

export function VisitHistoryPanel({ employerId, currentVisitId, onSelectVisit }: Props) {
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data: inspections } = await supabase
        .from('ce_inspections')
        .select('id, inspection_number, status, scheduled_date, actual_start, actual_end, check_in_time, check_out_time, inspector_name, location_address')
        .eq('employer_id', employerId)
        .order('actual_start', { ascending: false, nullsFirst: false })
        .order('scheduled_date', { ascending: false });

      if (!inspections || !alive) {
        setRows([]);
        setLoading(false);
        return;
      }

      const ids = inspections.map((i: any) => i.id);
      const [evRes, fnRes, vlRes] = await Promise.all([
        supabase.from('ce_inspection_evidence').select('inspection_id').in('inspection_id', ids),
        supabase.from('ce_inspection_findings').select('inspection_id, violation_created').in('inspection_id', ids),
        supabase.from('ce_violations').select('inspection_id').in('inspection_id', ids),
      ]);

      const tally = (arr: any[] | null, key: string) => {
        const m = new Map<string, number>();
        (arr ?? []).forEach((r) => m.set(r[key], (m.get(r[key]) ?? 0) + 1));
        return m;
      };
      const evMap = tally(evRes.data, 'inspection_id');
      const fnMap = tally(fnRes.data, 'inspection_id');
      const vlMap = tally(vlRes.data, 'inspection_id');

      if (!alive) return;
      setRows(
        inspections.map((i: any) => ({
          ...i,
          evidenceCount: evMap.get(i.id) ?? 0,
          findingsCount: fnMap.get(i.id) ?? 0,
          violationsCount: vlMap.get(i.id) ?? 0,
        }))
      );
      setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [employerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading visit history…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No prior visits recorded for this employer.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {rows.length} visit{rows.length === 1 ? '' : 's'} recorded for this employer.
        Multiple visits can be combined into a single audit report.
      </div>
      {rows.map((r) => {
        const isCurrent = r.id === currentVisitId;
        const dateStr = r.actual_start ?? r.check_in_time ?? r.scheduled_date;
        return (
          <div
            key={r.id}
            className={`p-4 rounded-lg border ${isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{r.inspection_number ?? r.id.slice(0, 8)}</span>
                  <Badge variant="outline" className={STATUS_STYLES[r.status ?? ''] ?? ''}>
                    {r.status ?? 'UNKNOWN'}
                  </Badge>
                  {isCurrent && <Badge variant="secondary">Current</Badge>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {dateStr ? formatDateForDisplay(dateStr) : '—'}
                  </span>
                  {r.inspector_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {r.inspector_name}
                    </span>
                  )}
                  {r.location_address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.location_address}
                    </span>
                  )}
                </div>
              </div>
              {!isCurrent && onSelectVisit && (
                <Button size="sm" variant="ghost" onClick={() => onSelectVisit(r.id)}>
                  <FileSearch className="h-4 w-4 mr-1" /> Open
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline" className="gap-1">
                <Camera className="h-3 w-3" /> {r.evidenceCount} evidence
              </Badge>
              <Badge variant="outline" className="gap-1">
                <ClipboardCheck className="h-3 w-3" /> {r.findingsCount} findings
              </Badge>
              <Badge variant="outline" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {r.violationsCount} violations
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
