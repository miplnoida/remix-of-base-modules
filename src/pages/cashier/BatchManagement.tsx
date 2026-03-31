import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Eye, Loader2, AlertTriangle, Search, Lock, Coins } from 'lucide-react';
import { useHeadCashier } from '@/hooks/useHeadCashier';
import { useDefaultOpeningBalance } from '@/hooks/useBatchBehaviorConfig';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/services/securityPolicyService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatDisplayDate } from '@/lib/dateFormat';
import {
  useCanManageAllBatches,
  useIsCashierRole,
  useCashierUsers,
  useDuplicateBatchMode,
  CashierUser,
} from '@/hooks/usePaymentModuleConfig';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ── Status helpers ──
const statusLabel = (s: string | null) => {
  if (s === 'O') return 'Open';
  if (s === 'V') return 'Verified';
  if (s === 'P') return 'Posted';
  return s || '—';
};

const statusVariant = (s: string | null): 'default' | 'secondary' | 'outline' => {
  if (s === 'O') return 'default';
  if (s === 'V') return 'secondary';
  return 'outline';
};

const BatchManagement: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const { canManageAllBatches, isLoading: permLoading } = useCanManageAllBatches();
  const { isCashier, isLoading: cashierRoleLoading } = useIsCashierRole();
  const { data: cashierUsers, isLoading: cashierUsersLoading } = useCashierUsers();
  const { mode: duplicateMode } = useDuplicateBatchMode();

  const [createOpen, setCreateOpen] = useState(false);
  const [viewBatch, setViewBatch] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Batch list query ──
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['cn-batches', canManageAllBatches, profile?.user_code],
    enabled: !permLoading && !!profile,
    queryFn: async () => {
      let query = supabase
        .from('cn_batch')
        .select('*')
        .order('date_entered', { ascending: false });

      if (!canManageAllBatches && profile?.user_code) {
        query = query.eq('entered_by', profile.user_code);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Filter batches by search
  const filteredBatches = useMemo(() => {
    if (!batches) return [];
    if (!searchTerm) return batches;
    const lower = searchTerm.toLowerCase();
    return batches.filter(b =>
      b.batch_number?.toLowerCase().includes(lower) ||
      b.entered_by?.toLowerCase().includes(lower) ||
      b.office_code?.toLowerCase().includes(lower)
    );
  }, [batches, searchTerm]);

  const isPageLoading = permLoading || cashierRoleLoading || batchesLoading;

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Batch Management</h1>
          <p className="text-sm text-muted-foreground">
            {canManageAllBatches ? 'Viewing all batches' : 'Viewing your batches'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Open New Batch
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search batch number, cashier, office..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Batch Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Batch Date</TableHead>
                <TableHead>Date Entered</TableHead>
                <TableHead className="text-right">Balance Forward</TableHead>
                <TableHead className="text-right">Opening Balance</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No batches found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBatches.map(b => (
                  <TableRow key={b.batch_number}>
                    <TableCell className="font-mono text-xs">{b.batch_number}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(b.batch_status)}>
                        {statusLabel(b.batch_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{b.entered_by || '—'}</TableCell>
                    <TableCell>{b.office_code || '—'}</TableCell>
                    <TableCell>{b.batch_date ? formatDisplayDate(b.batch_date) : '—'}</TableCell>
                    <TableCell>{b.date_entered ? formatDisplayDate(b.date_entered) : '—'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {(b.balance_forward ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(b.offset_amount ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewBatch(b)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {b.batch_status === 'O' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/cashier/cash-details?batch=${encodeURIComponent(b.batch_number)}`)}
                              title="Enter Cash Detail"
                            >
                              <Coins className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/cashier/batch-closing?batch=${encodeURIComponent(b.batch_number)}`)}
                              title="Close Batch"
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Open New Batch Dialog */}
      <OpenBatchDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        canManageAll={canManageAllBatches}
        isCashier={isCashier}
        cashierUsers={cashierUsers || []}
        cashierUsersLoading={cashierUsersLoading}
        profile={profile}
        duplicateMode={duplicateMode}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['cn-batches'] });
          setCreateOpen(false);
        }}
      />

      {/* View Batch Dialog */}
      <ViewBatchDialog batch={viewBatch} onClose={() => setViewBatch(null)} />
    </div>
  );
};

// ═══════════════════════════════════════════════════
// Open Batch Dialog
// ═══════════════════════════════════════════════════

interface OpenBatchDialogProps {
  open: boolean;
  onClose: () => void;
  canManageAll: boolean;
  isCashier: boolean;
  cashierUsers: CashierUser[];
  cashierUsersLoading: boolean;
  profile: any;
  duplicateMode: 'warning' | 'restriction';
  onCreated: () => void;
}

function OpenBatchDialog({
  open, onClose, canManageAll, isCashier, cashierUsers, cashierUsersLoading,
  profile, duplicateMode, onCreated,
}: OpenBatchDialogProps) {
  const { toast } = useToast();
  const [selectedCashierId, setSelectedCashierId] = useState<string>('');
  const batchDate = useMemo(() => new Date(), []);
  const batchDateDisplay = format(batchDate, 'dd/MM/yyyy');
  const [isCreating, setIsCreating] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Head cashier & opening balance hooks
  const { headCashier, isLoading: hcLoading } = useHeadCashier();
  const { headCashierBalance, cashierBalance, isLoading: obLoading } = useDefaultOpeningBalance();

  // Determine current user's cashier record
  const currentUserCashier = useMemo(
    () => cashierUsers.find(u => u.id === profile?.id),
    [cashierUsers, profile?.id]
  );

  // Auto-select for non-admin users who are cashiers
  const effectiveCashierId = canManageAll
    ? selectedCashierId
    : (currentUserCashier ? currentUserCashier.id : '');

  const selectedCashier = useMemo(
    () => cashierUsers.find(u => u.id === effectiveCashierId),
    [cashierUsers, effectiveCashierId]
  );

  // Is selected cashier the head cashier for today?
  const isSelectedHeadCashier = !!headCashier && !!selectedCashier && headCashier.user_code === selectedCashier.user_code;
  const computedOpeningBalance = isSelectedHeadCashier ? headCashierBalance : cashierBalance;

  // Office resolution state
  const [resolvedOffice, setResolvedOffice] = useState<{ code: string; description: string; isOverride: boolean } | null>(null);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [ipDetectedOffice, setIpDetectedOffice] = useState<{ code: string; description: string; ip: string } | null>(null);
  const [ipChecking, setIpChecking] = useState(false);

  // Detect office from IP when dialog opens
  useEffect(() => {
    if (!open) { setIpDetectedOffice(null); return; }
    let cancelled = false;
    (async () => {
      setIpChecking(true);
      try {
        const ip = await getClientIP();
        const { data, error } = await supabase.rpc('resolve_office_by_ip' as any, { p_ip_address: ip });
        if (!error && data) {
          const res = typeof data === 'string' ? JSON.parse(data) : data;
          if (res.matched && !cancelled) {
            setIpDetectedOffice({ code: res.office_code, description: res.office_description, ip });
          }
        }
      } catch (e) {
        console.error('[BatchManagement] IP office detection error:', e);
      } finally {
        if (!cancelled) setIpChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Resolve office when cashier changes (fallback to profile default)
  React.useEffect(() => {
    if (!effectiveCashierId) { setResolvedOffice(null); return; }
    setOfficeLoading(true);
    const dateStr = format(batchDate, 'yyyy-MM-dd');
    supabase.rpc('get_cashier_office_for_date' as any, {
      p_cashier_user_id: effectiveCashierId,
      p_date: dateStr,
    }).then(({ data, error }) => {
      if (!error && data) {
        const res = typeof data === 'string' ? JSON.parse(data) : data;
        setResolvedOffice({ code: res.office_code, description: res.office_description, isOverride: res.is_override });
      }
      setOfficeLoading(false);
    });
  }, [effectiveCashierId, batchDate]);

  // Validation
  const notCashierError = !canManageAll && !isCashier;
  const canCreate = !!selectedCashier && !notCashierError;

  const resetForm = () => {
    setSelectedCashierId('');
    setDuplicateWarning(null);
    setResolvedOffice(null);
    setIpDetectedOffice(null);
  };

  // Effective office: IP-detected takes priority, then head-cashier override, then profile default
  const effectiveOffice = ipDetectedOffice
    ? { code: ipDetectedOffice.code, description: ipDetectedOffice.description }
    : resolvedOffice
      ? { code: resolvedOffice.code, description: resolvedOffice.description }
      : selectedCashier
        ? { code: selectedCashier.office_code || 'HQ', description: selectedCashier.office_description || selectedCashier.office_code || 'HQ' }
        : null;

  const handleCreate = async (force = false) => {
    if (!selectedCashier) return;
    setIsCreating(true);
    setDuplicateWarning(null);

    try {
      const batchDateStr = format(batchDate, 'yyyy-MM-dd');

      // Validate batch creation against previous-open-batch config
      if (!force) {
        const { data: valResult, error: valErr } = await supabase
          .rpc('validate_batch_creation' as any, {
            p_cashier_user_code: selectedCashier.user_code,
            p_batch_date: batchDateStr,
          });
        if (!valErr) {
          const valRes = typeof valResult === 'string' ? JSON.parse(valResult) : valResult;
          if (valRes && !valRes.allowed) {
            toast({ title: 'Batch Creation Blocked', description: valRes.message, variant: 'destructive' });
            setIsCreating(false);
            return;
          }
        }

        // Server-side duplicate check via DB function
        const { data: dupResult, error: dupErr } = await supabase
          .rpc('check_duplicate_open_batch', {
            p_cashier_user_code: selectedCashier.user_code,
            p_batch_date: batchDateStr,
          });

        if (dupErr) throw dupErr;

        if ((dupResult as any)?.has_duplicate) {
          const serverMode = (dupResult as any).mode || 'warning';
          if (serverMode === 'restriction') {
            toast({
              title: 'Batch Already Exists',
              description: `${(dupResult as any).message}. Creation is blocked by configuration.`,
              variant: 'destructive',
            });
            setIsCreating(false);
            return;
          }
          // warning mode
          setDuplicateWarning(
            `${(dupResult as any).message}. Do you want to continue?`
          );
          setIsCreating(false);
          return;
        }
      }

      // Revoke expired head cashier roles
      await supabase.rpc('revoke_expired_head_cashier' as any);

      // Get balance forward from last batch
      const { data: lastBatch } = await supabase
        .from('cn_batch')
        .select('balance_forward, offset_amount')
        .order('date_entered', { ascending: false })
        .limit(1);
      const balanceForward = lastBatch && lastBatch.length > 0
        ? (lastBatch[0].balance_forward || 0) + (lastBatch[0].offset_amount || 0)
        : 0;

      const now = new Date();
      const officeCode = effectiveOffice?.code || selectedCashier.office_code || 'HQ';
      const batchNumber = `${officeCode}-${format(now, 'yyyyMMdd')}-${format(now, 'HHmmss')}`;

      const { error } = await supabase.from('cn_batch').insert({
        batch_number: batchNumber,
        batch_status: 'O',
        balance_status: 'N',
        entered_by: selectedCashier.user_code,
        date_entered: now.toISOString(),
        offset_amount: computedOpeningBalance,
        balance_forward: balanceForward,
        office_code: officeCode,
        batch_date: batchDate.toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Batch Created',
        description: `Batch ${batchNumber} created successfully.`,
      });
      resetForm();
      onCreated();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open New Batch</DialogTitle>
          <DialogDescription>
            Create a new payment batch for a cashier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Not-a-cashier error */}
          {notCashierError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your role is not configured as a cashier. You are not eligible to create batches. Please contact an administrator.
              </AlertDescription>
            </Alert>
          )}

          {/* Cashier selection */}
          <div className="space-y-1.5">
            <Label className="text-xs">Cashier</Label>
            {canManageAll ? (
              <Select value={selectedCashierId} onValueChange={setSelectedCashierId} disabled={cashierUsersLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={cashierUsersLoading ? 'Loading...' : 'Select a cashier'} />
                </SelectTrigger>
                <SelectContent>
                  {(cashierUsers || []).map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.user_code} ({u.user_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={currentUserCashier ? `${currentUserCashier.full_name} (${currentUserCashier.user_code})` : profile?.full_name || '—'}
                disabled
              />
            )}
          </div>

          {/* Office Location */}
          <div className="space-y-1.5">
            <Label className="text-xs">Office Location</Label>
            <Input
              value={officeLoading ? 'Loading...' : (resolvedOffice ? `${resolvedOffice.description} (${resolvedOffice.code})` : selectedCashier?.office_description || selectedCashier?.office_code || '—')}
              disabled
            />
            {resolvedOffice?.isOverride && (
              <p className="text-xs text-primary">(Override by Head Cashier)</p>
            )}
          </div>

          {/* Batch Date */}
          <div className="space-y-1.5">
            <Label className="text-xs">Batch Date</Label>
            <Input value={batchDateDisplay} disabled />
          </div>

          {/* Opening Balance */}
          <div className="space-y-1.5">
            <Label className="text-xs">Opening Balance</Label>
            <Input
              type="number"
              value={computedOpeningBalance.toFixed(2)}
              disabled
            />
            <p className="text-xs text-muted-foreground">
              {isSelectedHeadCashier ? 'Head Cashier rate' : 'Regular Cashier rate'} — configured in Opening Balances tab.
            </p>
          </div>

          {/* Duplicate warning */}
          {duplicateWarning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="text-sm">{duplicateWarning}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => handleCreate(true)} disabled={isCreating}>
                    {isCreating && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Yes, Create Anyway
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDuplicateWarning(null)}>
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={() => handleCreate(false)} disabled={!canCreate || isCreating || !!duplicateWarning}>
            {isCreating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Create Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════
// View Batch Dialog
// ═══════════════════════════════════════════════════

function ViewBatchDialog({ batch, onClose }: { batch: any; onClose: () => void }) {
  if (!batch) return null;

  const fields = [
    { label: 'Batch Number', value: batch.batch_number },
    { label: 'Status', value: statusLabel(batch.batch_status) },
    { label: 'Balance Status', value: batch.balance_status || '—' },
    { label: 'Cashier (Entered By)', value: batch.entered_by || '—' },
    { label: 'Office Code', value: batch.office_code || '—' },
    { label: 'Batch Date', value: batch.batch_date ? formatDisplayDate(batch.batch_date) : '—' },
    { label: 'Date Entered', value: batch.date_entered ? formatDisplayDate(batch.date_entered) : '—' },
    { label: 'Balance Forward', value: (batch.balance_forward ?? 0).toFixed(2) },
    { label: 'Opening Balance (Offset)', value: (batch.offset_amount ?? 0).toFixed(2) },
    { label: 'Verified By', value: batch.verified_by || '—' },
    { label: 'Date Verified', value: batch.date_verified ? formatDisplayDate(batch.date_verified) : '—' },
    { label: 'Posted By', value: batch.posted_by || '—' },
    { label: 'Date Posted', value: batch.date_posted ? formatDisplayDate(batch.date_posted) : '—' },
  ];

  return (
    <Dialog open={!!batch} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Batch Details</DialogTitle>
          <DialogDescription>Read-only view of batch {batch.batch_number}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2">
          {fields.map(f => (
            <div key={f.label}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <p className="text-sm font-medium">{f.value}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BatchManagement;
