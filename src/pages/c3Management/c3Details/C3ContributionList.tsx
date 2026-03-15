import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Trash2, CheckCircle2, XCircle, Printer, Home } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useNavigate } from 'react-router-dom';
import {
  getContributionList,
  deleteContribution,
  getContributionPreview,
  type C3ContributionRecord,
} from '@/services/wizC3DetailsService';
import { getCompaniesDropdown, type WizCompanyDropdown } from '@/services/wizAdminApiService';
import C3ContributionPreview from './previews/C3ContributionPreview';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

function formatCurrency(val: number) {
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), 'dd-MMM-yyyy'); } catch { return dateStr || ''; }
}

const C3ContributionList: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<WizCompanyDropdown[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [periodFromMonth, setPeriodFromMonth] = useState('');
  const [periodFromYear, setPeriodFromYear] = useState('');
  const [periodToMonth, setPeriodToMonth] = useState('');
  const [periodToYear, setPeriodToYear] = useState('');
  const [contributions, setContributions] = useState<C3ContributionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    getCompaniesDropdown().then(res => {
      setCompanies(res.data?.companies || []);
    }).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    if (!selectedCompanyId) { toast.error('Please select an employer'); return; }
    setLoading(true);
    try {
      const periodFrom = periodFromMonth && periodFromYear ? `${periodFromMonth}-${periodFromYear}` : undefined;
      const periodTo = periodToMonth && periodToYear ? `${periodToMonth}-${periodToYear}` : undefined;
      const res = await getContributionList({
        company_id: Number(selectedCompanyId),
        period_from: periodFrom,
        period_to: periodTo,
      });
      setContributions(res.data?.contributions || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load contributions');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, periodFromMonth, periodFromYear, periodToMonth, periodToYear]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteContribution(deleteId, 'employer');
      toast.success('Contribution deleted successfully');
      setDeleteId(null);
      handleSearch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handlePreview = async (headerId: number) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const res = await getContributionPreview(headerId);
      setPreviewData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load preview');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const selectedCompany = companies.find(c => String(c.id) === selectedCompanyId);

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
          <BreadcrumbItem><BreadcrumbPage>C3 Contribution</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Select Employer</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Employer..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name} ({c.registration_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Report List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {selectedCompanyId ? 'No contributions found. Try different filters.' : 'Select an employer and click Search.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-green-700 font-semibold">Month</TableHead>
                    <TableHead className="text-green-700 font-semibold">Year</TableHead>
                    <TableHead className="text-green-700 font-semibold">Wages</TableHead>
                    <TableHead className="text-green-700 font-semibold">Social Security</TableHead>
                    <TableHead className="text-green-700 font-semibold">Levy</TableHead>
                    <TableHead className="text-green-700 font-semibold">Fines and Penalties</TableHead>
                    <TableHead className="text-green-700 font-semibold">Severance</TableHead>
                    <TableHead className="text-green-700 font-semibold">Total</TableHead>
                    <TableHead className="text-green-700 font-semibold">Creation Date</TableHead>
                    <TableHead className="text-green-700 font-semibold">Schedule</TableHead>
                    <TableHead className="text-green-700 font-semibold">Is Nil</TableHead>
                    <TableHead className="text-green-700 font-semibold">Notes</TableHead>
                    <TableHead className="text-green-700 font-semibold">Is Submitted</TableHead>
                    <TableHead className="text-green-700 font-semibold">Preview</TableHead>
                    <TableHead className="text-green-700 font-semibold">Delete</TableHead>
                    <TableHead className="text-green-700 font-semibold">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((c) => (
                    <TableRow key={`${c.header_id}-${c.schedule}`}>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-blue-600 font-medium">{c.month}</span>
                        </span>
                      </TableCell>
                      <TableCell>{c.year}</TableCell>
                      <TableCell>{formatCurrency(c.wages)}</TableCell>
                      <TableCell>{formatCurrency(c.social_security)}</TableCell>
                      <TableCell>{formatCurrency(c.levy)}</TableCell>
                      <TableCell>{formatCurrency(c.fines_and_penalties)}</TableCell>
                      <TableCell>{formatCurrency(c.severance)}</TableCell>
                      <TableCell>{formatCurrency(c.total)}</TableCell>
                      <TableCell>{formatDate(c.creation_date)}</TableCell>
                      <TableCell>{c.schedule}</TableCell>
                      <TableCell>
                        {c.is_nil ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate">{c.notes}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.is_submitted
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          Yes
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(c.header_id)}>
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.header_id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        {c.payment_status === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs text-muted-foreground">
                            Paid <Printer className="h-3 w-3" />
                          </span>
                        ) : c.payment_status === '$ Pay' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-500 text-green-600 text-xs h-7"
                            onClick={() => navigate(`/c3-management/payment-details?header_id=${c.header_id}`)}
                          >
                            $ Pay
                          </Button>
                        ) : c.payment_status === 'BEMA' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs text-muted-foreground">
                            BEMA
                          </span>
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

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this contribution record? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <C3ContributionPreview
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewData(null); }}
        data={previewData}
        loading={previewLoading}
        companyName={selectedCompany?.company_name || ''}
        registrationNumber={selectedCompany?.registration_number || ''}
      />
    </div>
  );
};

export default C3ContributionList;
