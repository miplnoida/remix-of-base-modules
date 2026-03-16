import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageShell } from '@/components/common/PageShell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, Clock, Edit2, MoreVertical, FileDown, FileSpreadsheet, CheckCircle2, XCircle, ChevronLeft, ChevronRight, MessageSquareMore } from 'lucide-react';
import { toast } from 'sonner';
import {
  getReconciliationList,
  getReconciliationExport,
  uploadCyberSourceCsv,
  updateReconciliationData,
  updateReconciliationNotes,
  getReconciliationNotes,
  getCardHolderNames,
  getCyberSourceColumns,
  saveCyberSourceColumns,
  type ReconciliationRecord,
  type ReconciliationListResponse,
  type ColumnPreference,
  type CardHolderName,
} from '@/services/wizReconciliationService';

// ─── All CyberSource dynamic column definitions ──────
const ALL_CYBERSOURCE_COLUMNS = [
  { field: 'CyberSourceMerchantID', label: 'Cyber Source Merchant ID' },
  { field: 'DateandTime', label: 'Dateand Time' },
  { field: 'RequestID', label: 'Request ID' },
  { field: 'MerchantReferenceNumber', label: 'Merchant Reference Number' },
  { field: 'RetrievalReferenceNumber', label: 'Retrieval Reference Number' },
  { field: 'InstalmentIdentifier', label: 'Instalment Identifier' },
  { field: 'LastName', label: 'LastName' },
  { field: 'FirstName', label: 'FirstName' },
  { field: 'Email', label: 'Email' },
  { field: 'Amount', label: 'Amount' },
  { field: 'Currency', label: 'Currency' },
  { field: 'AccountPrefix', label: 'Account Prefix' },
  { field: 'AccountSuffix', label: 'Account Suffix' },
  { field: 'Applications', label: 'Applications' },
  { field: 'PaymentMethod', label: 'Payment Method' },
  { field: 'PaymentSolution', label: 'Payment Solution' },
  { field: 'TransactionReferenceNumber', label: 'Transaction Reference Number' },
  { field: 'AuthorisationIndicator', label: 'Authorisation Indicator' },
];

const DEFAULT_VISIBLE_FIELDS = [
  'CyberSourceMerchantID', 'DateandTime', 'RequestID',
  'MerchantReferenceNumber', 'RetrievalReferenceNumber',
  'InstalmentIdentifier', 'LastName', 'Amount',
];

const MOCK_USER_ID = 1; // placeholder

const ReconciliationPage: React.FC = () => {
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [cardHolderFilter, setCardHolderFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [cardHolderNames, setCardHolderNames] = useState<CardHolderName[]>([]);

  // Column prefs
  const [columnPrefs, setColumnPrefs] = useState<ColumnPreference[]>([]);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set(DEFAULT_VISIBLE_FIELDS));
  const [showColModal, setShowColModal] = useState(false);
  const [tempColPrefs, setTempColPrefs] = useState<ColumnPreference[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals
  const [bulkReconModal, setBulkReconModal] = useState(false);
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [toggleRow, setToggleRow] = useState<ReconciliationRecord | null>(null);
  const [toggleNotes, setToggleNotes] = useState('');
  const [toggleSubmitting, setToggleSubmitting] = useState(false);

  const [notesModal, setNotesModal] = useState<{ id: number; notes: string[] } | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);

  // CSV upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ─── Data fetching ────────────────────────────────
  const fetchList = useCallback(async (page = pageNumber) => {
    try {
      setLoading(true);
      const res = await getReconciliationList({
        page_number: page,
        page_size: pageSize,
        from_date: fromDate || null,
        to_date: toDate || null,
        status: statusFilter || null,
        card_holder_name: cardHolderFilter || null,
      });
      setRecords(res.records);
      setTotalRecords(res.total_records);
      setTotalPages(res.total_pages);
      setPageNumber(res.page_number);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, fromDate, toDate, statusFilter, cardHolderFilter]);

  useEffect(() => {
    fetchList(0);
    getCardHolderNames().then(setCardHolderNames).catch(() => {});
    getCyberSourceColumns(MOCK_USER_ID).then((cols) => {
      if (cols.length) {
        setColumnPrefs(cols);
        setVisibleFields(new Set(cols.filter(c => c.status).map(c => c.field)));
      }
    }).catch(() => {});
  }, []);

  const handleSearch = () => {
    if (fromDate && toDate && toDate < fromDate) {
      toast.error('To Date must be greater than or equal to From Date');
      return;
    }
    setSelectedIds(new Set());
    fetchList(0);
  };

  // ─── CSV Upload ──────────────────────────────────
  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { toast.error('Please select a CSV file'); return; }
    if (!file.name.endsWith('.csv')) { toast.error('Only .csv files are allowed'); return; }
    try {
      setUploading(true);
      const res = await uploadCyberSourceCsv(file, MOCK_USER_ID);
      toast.success(`Successfully Saved. ${res.inserted_count} records imported, ${res.skipped_duplicates} duplicates skipped.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchList(0);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  // ─── Selection ─────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Bulk Reconciliation ──────────────────────────
  const handleBulkReconcile = async () => {
    if (!bulkNotes.trim()) { toast.error('Please enter notes'); return; }
    try {
      setBulkSubmitting(true);
      await updateReconciliationData(Array.from(selectedIds), bulkNotes, MOCK_USER_ID);
      toast.success('Updated Successfully.');
      setBulkReconModal(false);
      setBulkNotes('');
      setSelectedIds(new Set());
      fetchList(pageNumber);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ─── Per-row toggle ───────────────────────────────
  const handleToggleSave = async () => {
    if (!toggleNotes.trim()) { toast.error('Please enter notes'); return; }
    const newStatus = toggleRow!.ReconciliationStatus !== 'Reconciled';
    try {
      setToggleSubmitting(true);
      await updateReconciliationNotes(toggleRow!.id, newStatus, toggleNotes, MOCK_USER_ID);
      toast.success('Updated Successfully.');
      setToggleRow(null);
      setToggleNotes('');
      fetchList(pageNumber);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setToggleSubmitting(false);
    }
  };

  // ─── Notes history ────────────────────────────────
  const handleShowNotes = async (rec: ReconciliationRecord) => {
    try {
      setNotesLoading(true);
      const notes = await getReconciliationNotes(rec.id);
      setNotesModal({ id: rec.id, notes });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setNotesLoading(false);
    }
  };

  // ─── Column customization ────────────────────────
  const openColModal = () => {
    const prefs = ALL_CYBERSOURCE_COLUMNS.map(c => ({
      field: c.field,
      status: visibleFields.has(c.field),
    }));
    setTempColPrefs(prefs);
    setShowColModal(true);
  };

  const applyColumns = async () => {
    const cols = tempColPrefs.map(c => ({ field: c.field, status: c.status, user_id: MOCK_USER_ID }));
    try {
      await saveCyberSourceColumns(cols);
      setVisibleFields(new Set(tempColPrefs.filter(c => c.status).map(c => c.field)));
      setShowColModal(false);
      toast.success('Columns updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // ─── Export ───────────────────────────────────────
  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const data = await getReconciliationExport();
      if (!data.length) { toast.error('No data to export'); return; }

      const headers = [
        'Transaction ID', 'Transaction Date', 'Payment Amount', 'Payment Status',
        'Reconciled By Name', 'Reconciled By Date', 'Notes',
        ...ALL_CYBERSOURCE_COLUMNS.filter(c => visibleFields.has(c.field)).map(c => c.label),
      ];

      const rows = data.map(r => [
        `="${r.PaymentGatewayTransactionID || ''}"`,
        r.TransactionDate || '',
        r.PaymentAmount ?? '',
        r.PaymentStatus || '',
        r.ReconciledByName || '',
        r.ReconciledDate || '',
        r.Notes || '',
        ...ALL_CYBERSOURCE_COLUMNS.filter(c => visibleFields.has(c.field)).map(c => r[c.field] ?? ''),
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reconciliation_Data.${format === 'csv' ? 'csv' : 'csv'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fmtDate = (d: string | null) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  };

  const fmtAmount = (a: number | null) => {
    if (a == null) return '';
    return `$${Number(a).toFixed(2)}`;
  };

  const dynamicCols = ALL_CYBERSOURCE_COLUMNS.filter(c => visibleFields.has(c.field));

  return (
    <PageShell
      title="Reconciliation"
      breadcrumbs={[
        { label: 'Dashboard', href: '/c3-management/dashboard' },
        { label: 'Administration' },
        { label: 'Reconciliation' },
      ]}
      error={error}
    >
      {/* Top row: Upload + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept=".csv" className="text-sm border rounded-lg px-3 py-2 bg-card" />
          <Button variant="outline" onClick={handleUpload} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />{uploading ? 'Uploading...' : 'Upload CSV File'}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (!selectedIds.size) { toast.error('Select at least one pending record'); return; }
              setBulkReconModal(true);
            }}
          >
            <Clock className="h-4 w-4 mr-2" />Reconciliation
          </Button>
          <Button variant="outline" onClick={openColModal}>
            <Edit2 className="h-4 w-4 mr-2" />Customize Column
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="bg-card border rounded-lg p-4 mb-4">
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-3">
            <Label className="text-xs text-muted-foreground">Reconcile Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Reconcile Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_statuses">All</SelectItem>
                <SelectItem value="Reconciled">Reconciled</SelectItem>
                <SelectItem value="Pending">Not Reconciled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Label className="text-xs text-muted-foreground">Card Holder Name</Label>
            <Select value={cardHolderFilter} onValueChange={setCardHolderFilter}>
              <SelectTrigger><SelectValue placeholder="Card Holder Name" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_holders">All</SelectItem>
                {cardHolderNames.map(n => (
                  <SelectItem key={n.cardHolderName} value={n.cardHolderName}>{n.cardHolderName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Button onClick={handleSearch} className="w-full">
              <Search className="h-4 w-4 mr-2" />Search
            </Button>
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Reconciliation List</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              <FileDown className="h-4 w-4 mr-2" />Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('xlsx')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Data table */}
      <div className="bg-card border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Status</TableHead>
              <TableHead>Payment Transaction ID</TableHead>
              <TableHead>Transaction Date</TableHead>
              <TableHead>Payment Amount</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Reconciled By Name</TableHead>
              <TableHead>Reconciled By Date</TableHead>
              <TableHead>Notes</TableHead>
              {dynamicCols.map(c => <TableHead key={c.field}>{c.label}</TableHead>)}
              <TableHead>Reconciliation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9 + dynamicCols.length} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : records.length === 0 ? (
              <TableRow><TableCell colSpan={9 + dynamicCols.length} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
            ) : records.map(r => {
              const isRecon = r.ReconciliationStatus === 'Reconciled';
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Checkbox
                      checked={isRecon || selectedIds.has(r.id)}
                      disabled={isRecon}
                      onCheckedChange={() => toggleSelect(r.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.PaymentGatewayTransactionID}</TableCell>
                  <TableCell>{fmtDate(r.TransactionDate)}</TableCell>
                  <TableCell>{fmtAmount(r.PaymentAmount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {r.PaymentStatus === 'AUTHORIZED' ? (
                        <><CheckCircle2 className="h-4 w-4 text-primary" /><span className="text-primary text-sm">AUTHORIZED</span></>
                      ) : (
                        <><XCircle className="h-4 w-4 text-destructive" /><span className="text-destructive text-sm">{r.PaymentStatus}</span></>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{r.ReconciledByName || ''}</TableCell>
                  <TableCell>{fmtDate(r.ReconciledDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm truncate max-w-[120px]">{r.Notes?.split(',')[0] || ''}</span>
                      {r.Notes && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleShowNotes(r)}>
                          <MessageSquareMore className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  {dynamicCols.map(c => <TableCell key={c.field} className="text-xs">{r[c.field] ?? ''}</TableCell>)}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={isRecon} onCheckedChange={() => { setToggleRow(r); setToggleNotes(''); }} />
                      <span className={`text-xs font-medium ${isRecon ? 'text-primary' : 'text-muted-foreground'}`}>
                        {isRecon ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-muted-foreground">{totalRecords}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={pageNumber <= 0} onClick={() => fetchList(pageNumber - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <Button variant="outline" size="sm" disabled={pageNumber >= totalPages - 1} onClick={() => fetchList(pageNumber + 1)}>
            Next<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Bulk Reconciliation Modal */}
      <Dialog open={bulkReconModal} onOpenChange={setBulkReconModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Are you sure want to reconcile?</DialogTitle></DialogHeader>
          <Textarea placeholder="Enter reason here" value={bulkNotes} onChange={e => setBulkNotes(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkReconModal(false)}>Cancel</Button>
            <Button onClick={handleBulkReconcile} disabled={bulkSubmitting}>
              {bulkSubmitting ? 'Processing...' : 'Reconciliation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-row Toggle Modal */}
      <Dialog open={!!toggleRow} onOpenChange={(v) => !v && setToggleRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Status will change to: <strong>{toggleRow?.ReconciliationStatus === 'Reconciled' ? 'Unreconciled' : 'Reconciled'}</strong>
          </p>
          <Textarea placeholder="Enter notes" value={toggleNotes} onChange={e => setToggleNotes(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleRow(null)}>Cancel</Button>
            <Button onClick={handleToggleSave} disabled={toggleSubmitting}>
              {toggleSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes History Modal */}
      <Dialog open={!!notesModal} onOpenChange={(v) => !v && setNotesModal(null)}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Notes History</DialogTitle></DialogHeader>
          {notesModal?.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes found.</p>
          ) : (
            <div className="space-y-3">
              {notesModal?.notes.map((n, i) => (
                <div key={i} className="bg-muted/50 rounded-md p-3 text-sm">{n}</div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customize Column Modal */}
      <Dialog open={showColModal} onOpenChange={setShowColModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Table Customize Column</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No.</TableHead>
                <TableHead>Column Name</TableHead>
                <TableHead className="w-20">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tempColPrefs.map((c, i) => (
                <TableRow key={c.field}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{c.field}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={c.status}
                      onCheckedChange={(checked) => {
                        setTempColPrefs(prev => prev.map((p, j) => j === i ? { ...p, status: !!checked } : p));
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowColModal(false)}>No</Button>
            <Button onClick={applyColumns}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default ReconciliationPage;
