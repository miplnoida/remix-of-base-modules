import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Search, Eye, FileText, DollarSign, CheckCircle, RotateCcw, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService } from '@/services/accountsPayableService';
import { APPosting } from '@/types/accountsPayable';

const APPostingHistory: React.FC = () => {
  const navigate = useNavigate();
  const [postings, setPostings] = useState<APPosting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPosting, setSelectedPosting] = useState<APPosting | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    loadPostings();
  }, []);

  const loadPostings = async () => {
    setLoading(true);
    const data = await accountsPayableService.getAPPostings();
    setPostings(data);
    setLoading(false);
  };

  const filteredPostings = postings.filter(p =>
    p.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = {
    totalPostings: postings.length,
    totalAmount: postings.filter(p => p.status === 'POSTED').reduce((s, p) => s + p.totalDebits, 0),
    reversed: postings.filter(p => p.status === 'REVERSED').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="AP Posting History"
        subtitle="View posted AP batches and GL entries"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: 'Posting History' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Postings</p>
                <p className="text-2xl font-bold">{totals.totalPostings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Posted Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <RotateCcw className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reversed</p>
                <p className="text-2xl font-bold">{totals.reversed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by batch number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Postings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Posted Batches</CardTitle>
          <CardDescription>Complete GL posting history for AP batches</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead className="text-right">Total Debits</TableHead>
                <TableHead className="text-right">Total Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Posted By</TableHead>
                <TableHead>Posted At</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredPostings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">No postings found</TableCell>
                </TableRow>
              ) : (
                filteredPostings.map((posting) => (
                  <TableRow key={posting.id}>
                    <TableCell className="font-medium">{posting.batchNumber}</TableCell>
                    <TableCell>{new Date(posting.postingDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(posting.totalDebits)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(posting.totalCredits)}</TableCell>
                    <TableCell>
                      <Badge variant={posting.status === 'POSTED' ? 'default' : 'destructive'}>
                        {posting.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{posting.postedByName}</TableCell>
                    <TableCell>{new Date(posting.postedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { setSelectedPosting(posting); setShowDetailDialog(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>GL Posting Detail - {selectedPosting?.batchNumber}</DialogTitle>
          </DialogHeader>
          {selectedPosting && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Posting Date</p>
                  <p className="font-medium">{new Date(selectedPosting.postingDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedPosting.status === 'POSTED' ? 'default' : 'destructive'}>
                    {selectedPosting.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Posted By</p>
                  <p className="font-medium">{selectedPosting.postedByName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Posted At</p>
                  <p className="font-medium">{new Date(selectedPosting.postedAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Journal Entries</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPosting.journalEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono">{entry.accountCode}</TableCell>
                        <TableCell>{entry.accountName}</TableCell>
                        <TableCell className="text-right">
                          {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">{entry.description}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedPosting.totalDebits)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(selectedPosting.totalCredits)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {selectedPosting.status === 'REVERSED' && (
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <p className="font-medium text-destructive">Reversal Information</p>
                  <p className="text-sm mt-1">
                    Reversed by {selectedPosting.reversedBy} on {selectedPosting.reversedAt ? new Date(selectedPosting.reversedAt).toLocaleString() : 'N/A'}
                  </p>
                  {selectedPosting.reversalReason && (
                    <p className="text-sm mt-1">Reason: {selectedPosting.reversalReason}</p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default APPostingHistory;
