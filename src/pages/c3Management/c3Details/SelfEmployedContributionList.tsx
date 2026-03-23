import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Search, Eye, Trash2, CheckCircle2, Printer, Home } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useNavigate } from 'react-router-dom';
import {
  getSeContributionList,
  getSelfEmployedDropdown,
  deleteContribution,
  getSeContributionPreview,
  type SeContributionRecord,
  type SelfEmployedDropdownItem,
} from '@/services/wizC3DetailsService';
import SeContributionPreview from './previews/SeContributionPreview';
import { PaymentReceiptModal } from '@/components/c3/PaymentReceiptModal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

function formatCurrency(val: number) {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), 'dd-MMM-yyyy'); } catch { return dateStr || ''; }
}

const SelfEmployedContributionList: React.FC = () => {
  const navigate = useNavigate();
  const [seList, setSeList] = useState<SelfEmployedDropdownItem[]>([]);
  const [selectedSeId, setSelectedSeId] = useState('');
  const [periodFromMonth, setPeriodFromMonth] = useState('');
  const [periodFromYear, setPeriodFromYear] = useState('');
  const [periodToMonth, setPeriodToMonth] = useState('');
  const [periodToYear, setPeriodToYear] = useState('');
  const [contributions, setContributions] = useState<SeContributionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Receipt modal (Paid button)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalRecord, setReceiptModalRecord] = useState<SeContributionRecord | null>(null);

  useEffect(() => {
    getSelfEmployedDropdown().then(res => setSeList(res.data?.self_employed || [])).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    if (!selectedSeId) { toast.error('Please select a Self Employee'); return; }
    setLoading(true);
    try {
      const periodFrom = periodFromMonth && periodFromYear ? `${periodFromMonth}-${periodFromYear}` : undefined;
      const periodTo = periodToMonth && periodToYear ? `${periodToMonth}-${periodToYear}` : undefined;
      const res = await getSeContributionList({ self_employed_id: Number(selectedSeId), period_from: periodFrom, period_to: periodTo });
      setContributions(res.data?.contributions || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load contributions');
    } finally { setLoading(false); }
  }, [selectedSeId, periodFromMonth, periodFromYear, periodToMonth, periodToYear]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteContribution(deleteId, 'self_employed');
      toast.success('Contribution deleted successfully');
      setDeleteId(null);
      handleSearch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally { setDeleting(false); }
  };

  const handlePreview = async (contributionId: number) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const res = await getSeContributionPreview(contributionId);
      setPreviewData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load preview');
      setPreviewOpen(false);
    } finally { setPreviewLoading(false); }
  };

  // "$ Pay" → navigate to full offline payment page
  const handlePay = (record: SeContributionRecord) => {
    navigate(`/c3-management/offline-payment/self_employed/${record.contribution_id}`);
  };

  // "Paid" → open receipt modal
  const handlePaid = (record: SeContributionRecord) => {
    setReceiptModalRecord(record);
    setReceiptModalOpen(true);
  };

  return (
    <div className="p-6 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="cursor-pointer flex items-center gap-1" onClick={() => navigate('/c3-management/dashboard')}>
              <Home className="h-3.5 w-3.5" /> Admin Dashboard
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Self Employed</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Select Self Employee</Label>
              <SearchableSelect
                value={selectedSeId}
                onValueChange={setSelectedSeId}
                placeholder="Select Self Employee..."
                searchPlaceholder="Search by name or SSN..."
                emptyMessage="No self employed found."
                options={seList.map(s => ({
                  value: String(s.id),
                  label: `${s.name} (${s.social_security_number})`,
                  searchText: `${s.social_security_number}`,
                }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Period From:</Label>
              <div className="flex gap-1">
                <Select value={periodFromMonth} onValueChange={setPeriodFromMonth}>
                  <SelectTrigger className="w-[80px]"><SelectValue placeholder="MMM" /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={periodFromYear} onValueChange={setPeriodFromYear}>
                  <SelectTrigger className="w-[90px]"><SelectValue placeholder="YYYY" /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Period To:</Label>
              <div className="flex gap-1">
                <Select value={periodToMonth} onValueChange={setPeriodToMonth}>
                  <SelectTrigger className="w-[80px]"><SelectValue placeholder="MMM" /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={periodToYear} onValueChange={setPeriodToYear}>
                  <SelectTrigger className="w-[90px]"><SelectValue placeholder="YYYY" /></SelectTrigger>
                  <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSearch} disabled={loading} className="gap-1">
              <Search className="h-4 w-4" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Report List</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {selectedSeId ? 'No contributions found.' : 'Select a Self Employee and click Search.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-green-700 font-semibold">Month</TableHead>
                    <TableHead className="text-green-700 font-semibold">Year</TableHead>
                    <TableHead className="text-green-700 font-semibold">Wages</TableHead>
                    <TableHead className="text-green-700 font-semibold">Fine</TableHead>
                    <TableHead className="text-green-700 font-semibold">Total</TableHead>
                    <TableHead className="text-green-700 font-semibold">Creation Date</TableHead>
                    <TableHead className="text-green-700 font-semibold">Notes</TableHead>
                    <TableHead className="text-green-700 font-semibold">Is Submitted</TableHead>
                    <TableHead className="text-green-700 font-semibold">Preview</TableHead>
                    <TableHead className="text-green-700 font-semibold">Delete</TableHead>
                    <TableHead className="text-green-700 font-semibold">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((c) => (
                    <TableRow key={c.contribution_id}>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-blue-600 font-medium">{c.month}</span>
                        </span>
                      </TableCell>
                      <TableCell>{c.year}</TableCell>
                      <TableCell>{formatCurrency(c.wages)}</TableCell>
                      <TableCell>{formatCurrency(c.fine)}</TableCell>
                      <TableCell>{formatCurrency(c.total)}</TableCell>
                      <TableCell>{formatDate(c.creation_date)}</TableCell>
                      <TableCell className="max-w-[100px] truncate">{c.notes}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.is_submitted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          Yes
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(c.contribution_id)}>
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.contribution_id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        {c.payment_status === 'Paid' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs text-muted-foreground cursor-pointer hover:bg-muted/50"
                            onClick={() => handlePaid(c)}
                            title="Download Payment Receipt"
                          >
                            Paid <Printer className="h-3 w-3 text-green-600" />
                          </span>
                        ) : c.payment_status === '$ Pay' ? (
                          <Button variant="outline" size="sm" className="border-green-500 text-green-600 text-xs h-7"
                            onClick={() => handlePay(c)}>
                            $ Pay
                          </Button>
                        ) : c.payment_status === 'BEMA' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs text-muted-foreground">BEMA</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this contribution record?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SeContributionPreview
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewData(null); }}
        data={previewData}
        loading={previewLoading}
      />

      {/* Payment Receipt Modal (Paid button) */}
      {receiptModalRecord && (
        <PaymentReceiptModal
          open={receiptModalOpen}
          onClose={() => { setReceiptModalOpen(false); setReceiptModalRecord(null); }}
          headerId={receiptModalRecord.contribution_id}
          entityType="self_employed"
          transactionId={receiptModalRecord.transaction_id}
        />
      )}
    </div>
  );
};

export default SelfEmployedContributionList;
