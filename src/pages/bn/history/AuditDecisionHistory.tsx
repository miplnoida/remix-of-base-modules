/**
 * Audit & Decision History (Screen 22)
 *
 * Business Purpose: Full decision/calculation/evidence/payment audit trail.
 * Unified view across bn_claim_event for complete lifecycle audit.
 *
 * Tables: bn_claim_event, bn_claim, bn_product
 * Access: Read-only, supervisor+ roles
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  History, Search, Lock, Loader2, X, FileText,
  ShieldCheck, Calculator, Eye, UserCheck, AlertTriangle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDateForDisplay } from '@/lib/format-config';
import { supabase } from '@/integrations/supabase/client';
import { useTablePagination } from '@/hooks/useTablePagination';

import { formatAuditTimestamp, formatNumber } from '@/lib/culture/culture';
const db = supabase as any;

interface AuditEvent {
  id: string;
  claim_id: string;
  claim_number: string | null;
  ssn: string | null;
  event_type: string;
  action: string;
  performed_by: string;
  performed_at: string;
  narrative: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  metadata: Record<string, any> | null;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  STATUS_CHANGE: { label: 'Status Change', icon: ShieldCheck, color: 'text-blue-600' },
  ELIGIBILITY_CHECK: { label: 'Eligibility', icon: ShieldCheck, color: 'text-violet-600' },
  CALCULATION: { label: 'Calculation', icon: Calculator, color: 'text-indigo-600' },
  EVIDENCE_UPDATE: { label: 'Evidence', icon: FileText, color: 'text-amber-600' },
  DECISION: { label: 'Decision', icon: UserCheck, color: 'text-green-600' },
  APPROVAL: { label: 'Approval', icon: ShieldCheck, color: 'text-emerald-600' },
  OVERRIDE: { label: 'Override', icon: AlertTriangle, color: 'text-orange-600' },
  PAYMENT: { label: 'Payment', icon: FileText, color: 'text-primary' },
  INQUIRY_ACCESS: { label: 'Inquiry', icon: Eye, color: 'text-muted-foreground' },
  NOTE: { label: 'Note', icon: FileText, color: 'text-muted-foreground' },
};

interface AuditFilters {
  ssn?: string;
  claim_number?: string;
  event_type?: string;
  performed_by?: string;
  date_from?: string;
  date_to?: string;
}

function useAuditEvents(filters: AuditFilters | null) {
  return useQuery({
    queryKey: ['bn', 'audit-events', filters],
    queryFn: async () => {
      if (!filters) return [];
      let query = db.from('bn_claim_event')
        .select('*, bn_claim(claim_number, ssn)')
        .order('performed_at', { ascending: false })
        .limit(500);

      if (filters.event_type) query = query.eq('event_type', filters.event_type);
      if (filters.performed_by) query = query.ilike('performed_by', `%${filters.performed_by}%`);
      if (filters.date_from) query = query.gte('performed_at', filters.date_from);
      if (filters.date_to) query = query.lte('performed_at', filters.date_to);

      // SSN/claim filter requires joining bn_claim
      if (filters.ssn) {
        const { data: claims } = await db.from('bn_claim').select('id').eq('ssn', filters.ssn);
        const ids = (claims || []).map((c: any) => c.id);
        if (ids.length === 0) return [];
        query = query.in('claim_id', ids);
      }
      if (filters.claim_number) {
        const { data: claims } = await db.from('bn_claim').select('id').ilike('claim_number', `%${filters.claim_number}%`);
        const ids = (claims || []).map((c: any) => c.id);
        if (ids.length === 0) return [];
        query = query.in('claim_id', ids);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((e: any) => ({
        id: e.id,
        claim_id: e.claim_id,
        claim_number: e.bn_claim?.claim_number || null,
        ssn: e.bn_claim?.ssn || null,
        event_type: e.event_type || 'NOTE',
        action: e.action || '',
        performed_by: e.performed_by || '',
        performed_at: e.performed_at || e.created_at || '',
        narrative: e.narrative || null,
        old_values: e.old_values || null,
        new_values: e.new_values || null,
        metadata: e.metadata || null,
      })) as AuditEvent[];
    },
    enabled: !!filters,
  });
}

export default function AuditDecisionHistory() {
  const [filters, setFilters] = useState<AuditFilters | null>(null);
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  // Form state
  const [ssn, setSsn] = useState('');
  const [claimNum, setClaimNum] = useState('');
  const [eventType, setEventType] = useState('');
  const [performer, setPerformer] = useState('');

  const { data: events = [], isLoading } = useAuditEvents(filters);
  const pagination = useTablePagination(events, 50);

  const stats = useMemo(() => {
    const types: Record<string, number> = {};
    events.forEach(e => {
      types[e.event_type] = (types[e.event_type] || 0) + 1;
    });
    return { total: events.length, types };
  }, [events]);

  const handleSearch = () => {
    setFilters({
      ssn: ssn || undefined,
      claim_number: claimNum || undefined,
      event_type: eventType || undefined,
      performed_by: performer || undefined,
    });
    pagination.resetPagination();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <History className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="t-page-title">Audit & Decision History</h1>
            <p className="text-sm text-muted-foreground">
              Full lifecycle audit trail — decisions, calculations, overrides, and payments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Read-Only</span>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">SSN</Label>
              <Input value={ssn} onChange={(e) => setSsn(e.target.value)} placeholder="SSN" className="w-32" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Claim #</Label>
              <Input value={claimNum} onChange={(e) => setClaimNum(e.target.value)} placeholder="Claim" className="w-36" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Event Type</Label>
              <Select value={eventType || '__all'} onValueChange={(v) => setEventType(v === '__all' ? '' : v)}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All Types</SelectItem>
                  {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Performed By</Label>
              <Input value={performer} onChange={(e) => setPerformer(e.target.value)} placeholder="User code" className="w-32" />
            </div>
            <Button onClick={handleSearch} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {filters && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {stats.total} event(s) found
          </Badge>
          {Object.entries(stats.types).slice(0, 6).map(([type, count]) => {
            const meta = EVENT_TYPE_LABELS[type];
            return (
              <Badge key={type} variant="secondary" className="px-2 py-1 text-[10px]">
                {meta?.label || type}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Results */}
      {filters && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No audit events found.</div>
            ) : (
              <>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold text-xs w-[120px]">Type</TableHead>
                        <TableHead className="font-semibold text-xs">Action</TableHead>
                        <TableHead className="font-semibold text-xs">Claim</TableHead>
                        <TableHead className="font-semibold text-xs">SSN</TableHead>
                        <TableHead className="font-semibold text-xs">Performed By</TableHead>
                        <TableHead className="font-semibold text-xs">Date/Time</TableHead>
                        <TableHead className="font-semibold text-xs">Narrative</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagination.paginatedData.map((e: AuditEvent) => {
                        const meta = EVENT_TYPE_LABELS[e.event_type] || { label: e.event_type, icon: FileText, color: 'text-muted-foreground' };
                        const Icon = meta.icon;
                        return (
                          <TableRow key={e.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelected(e)}>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                                <span className="text-xs">{meta.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium">{e.action}</TableCell>
                            <TableCell className="font-mono text-xs">{e.claim_number || '—'}</TableCell>
                            <TableCell className="font-mono text-xs">{e.ssn || '—'}</TableCell>
                            <TableCell className="text-xs">{e.performed_by}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {e.performed_at ? formatAuditTimestamp(e.performed_at) : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {e.narrative || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {pagination.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Page {pagination.pagination.page} of {pagination.pagination.totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={pagination.prevPage} disabled={pagination.pagination.page === 1}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={pagination.nextPage} disabled={pagination.pagination.page === pagination.pagination.totalPages}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!filters && (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Enter search criteria above</p>
          <p className="text-sm mt-1">Search across all audit events for decisions, calculations, and overrides</p>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Audit Event Detail
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Event Type</p>
                    <Badge variant="outline" className="text-xs">
                      {EVENT_TYPE_LABELS[selected.event_type]?.label || selected.event_type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Action</p>
                    <p className="text-sm font-medium">{selected.action}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Claim #</p>
                    <p className="font-mono text-sm">{selected.claim_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">SSN</p>
                    <p className="font-mono text-sm">{selected.ssn || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Performed By</p>
                    <p className="text-sm">{selected.performed_by}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Date/Time</p>
                    <p className="text-sm">{formatAuditTimestamp(selected.performed_at)}</p>
                  </div>
                </div>

                {selected.narrative && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Narrative</p>
                    <p className="text-sm bg-muted/50 rounded p-3">{selected.narrative}</p>
                  </div>
                )}

                {selected.old_values && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Previous Values</p>
                    <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto max-h-40">
                      {JSON.stringify(selected.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selected.new_values && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">New Values</p>
                    <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto max-h-40">
                      {JSON.stringify(selected.new_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selected.metadata && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Metadata</p>
                    <pre className="text-xs bg-muted/50 rounded p-3 overflow-auto max-h-40">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
