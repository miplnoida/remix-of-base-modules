import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Banknote,
  Calendar,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Download,
  Trash2,
  Edit
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveBanks } from '@/data/bankData';

interface EFTEntry {
  id: string;
  referenceNumber: string;
  bankName: string;
  accountNumber: string;
  payerName: string;
  payerId?: string;
  amount: number;
  currency: 'EC$' | 'US$';
  depositDate: string;
  entryDate: string;
  description: string;
  category: 'contribution' | 'rent' | 'loan' | 'service' | 'other';
  status: 'pending' | 'matched' | 'posted' | 'rejected';
  batchId: string;
  enteredBy: string;
  matchedInvoice?: string;
  glAccount?: string;
  remarks?: string;
}

const EFTEntry: React.FC = () => {
  const { user } = useAuth();
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [eftEntries, setEftEntries] = useState<EFTEntry[]>([]);
  const [formData, setFormData] = useState({
    referenceNumber: '',
    bankName: '',
    accountNumber: '',
    payerName: '',
    payerId: '',
    amount: '',
    currency: 'EC$' as 'EC$' | 'US$',
    depositDate: new Date().toISOString().slice(0, 10),
    description: '',
    category: 'contribution' as 'contribution' | 'rent' | 'loan' | 'service' | 'other',
    glAccount: '',
    remarks: ''
  });
  const [editingEntry, setEditingEntry] = useState<string | null>(null);

  const banks = getActiveBanks();

  useEffect(() => {
    // Initialize active batch
    setActiveBatch({
      id: 'BATCH-2024-001',
      batchNumber: `EFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
      cashierId: user?.email?.split('@')[0] || 'cashier',
      cashierName: user?.name || 'Current User',
      date: new Date().toISOString().slice(0, 10),
      status: 'open'
    });

    // Load mock EFT entries
    setEftEntries([
      {
        id: '1',
        referenceNumber: 'EFT240925001',
        bankName: 'Royal Bank of Canada',
        accountNumber: 'SSNB-001-4567',
        payerName: 'ABC Manufacturing Ltd',
        payerId: 'EMP001',
        amount: 5000.00,
        currency: 'EC$',
        depositDate: '2024-09-25',
        entryDate: new Date().toISOString(),
        description: 'C3 Contributions - September 2024',
        category: 'contribution',
        status: 'pending',
        batchId: 'BATCH-2024-001',
        enteredBy: user?.email || 'current-user'
      }
    ]);
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateEFTReference = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = (eftEntries.length + 1).toString().padStart(3, '0');
    return `EFT${dateStr}${sequence}`;
  };

  const validateForm = () => {
    if (!formData.referenceNumber) {
      toast.error('Reference number is required');
      return false;
    }
    if (!formData.bankName) {
      toast.error('Bank name is required');
      return false;
    }
    if (!formData.payerName) {
      toast.error('Payer name is required');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Valid amount is required');
      return false;
    }
    if (!formData.depositDate) {
      toast.error('Deposit date is required');
      return false;
    }
    return true;
  };

  const saveEFTEntry = () => {
    if (!validateForm()) return;

    const newEntry: EFTEntry = {
      id: editingEntry || Date.now().toString(),
      referenceNumber: formData.referenceNumber,
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      payerName: formData.payerName,
      payerId: formData.payerId,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      depositDate: formData.depositDate,
      entryDate: new Date().toISOString(),
      description: formData.description,
      category: formData.category,
      status: 'pending',
      batchId: activeBatch?.id || '',
      enteredBy: user?.email || 'current-user',
      glAccount: formData.glAccount,
      remarks: formData.remarks
    };

    if (editingEntry) {
      setEftEntries(prev => prev.map(entry => 
        entry.id === editingEntry ? newEntry : entry
      ));
      toast.success('EFT entry updated successfully');
    } else {
      setEftEntries(prev => [...prev, newEntry]);
      toast.success('EFT entry saved successfully');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      referenceNumber: '',
      bankName: '',
      accountNumber: '',
      payerName: '',
      payerId: '',
      amount: '',
      currency: 'EC$',
      depositDate: new Date().toISOString().slice(0, 10),
      description: '',
      category: 'contribution',
      glAccount: '',
      remarks: ''
    });
    setEditingEntry(null);
  };

  const editEntry = (entry: EFTEntry) => {
    setFormData({
      referenceNumber: entry.referenceNumber,
      bankName: entry.bankName,
      accountNumber: entry.accountNumber,
      payerName: entry.payerName,
      payerId: entry.payerId || '',
      amount: entry.amount.toString(),
      currency: entry.currency,
      depositDate: entry.depositDate,
      description: entry.description,
      category: entry.category,
      glAccount: entry.glAccount || '',
      remarks: entry.remarks || ''
    });
    setEditingEntry(entry.id);
  };

  const deleteEntry = (id: string) => {
    setEftEntries(prev => prev.filter(entry => entry.id !== id));
    toast.success('EFT entry deleted');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'matched': return 'bg-blue-100 text-blue-800';
      case 'posted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalAmount = eftEntries.reduce((sum, entry) => sum + entry.amount, 0);

  if (!activeBatch) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Active Batch</AlertTitle>
          <AlertDescription>
            No active batch found for EFT processing. Please contact system administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">EFT Entry Management</h1>
          <p className="text-muted-foreground">Record and manage Electronic Funds Transfer deposits</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Batch: {activeBatch.batchNumber}
        </Badge>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            EFT Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Total Entries</div>
              <div className="text-2xl font-bold">{eftEntries.length}</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold text-green-600">EC$ {totalAmount.toFixed(2)}</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-sm text-muted-foreground">Pending Entries</div>
              <div className="text-2xl font-bold text-yellow-600">
                {eftEntries.filter(e => e.status === 'pending').length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* EFT Entry Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {editingEntry ? 'Edit EFT Entry' : 'New EFT Entry'}
              </CardTitle>
              <CardDescription>
                Record electronic fund transfer deposits received by the bank
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">EFT Reference Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="referenceNumber"
                      value={formData.referenceNumber}
                      onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                      placeholder="Enter EFT reference"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleInputChange('referenceNumber', generateEFTReference())}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositDate">Deposit Date</Label>
                  <Input
                    id="depositDate"
                    type="date"
                    value={formData.depositDate}
                    onChange={(e) => handleInputChange('depositDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Select
                    value={formData.bankName}
                    onValueChange={(value) => handleInputChange('bankName', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map(bank => (
                        <SelectItem key={bank.id} value={bank.name}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    placeholder="Enter account number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payerName">Payer Name</Label>
                  <Input
                    id="payerName"
                    value={formData.payerName}
                    onChange={(e) => handleInputChange('payerName', e.target.value)}
                    placeholder="Enter payer name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payerId">Payer ID (Optional)</Label>
                  <Input
                    id="payerId"
                    value={formData.payerId}
                    onChange={(e) => handleInputChange('payerId', e.target.value)}
                    placeholder="Employer/Person ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleInputChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EC$">EC$</SelectItem>
                      <SelectItem value="US$">US$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contribution">Social Security Contribution</SelectItem>
                      <SelectItem value="rent">Rent Payment</SelectItem>
                      <SelectItem value="loan">Loan Payment</SelectItem>
                      <SelectItem value="service">Service Fee</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter description of the deposit"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="glAccount">GL Account (Optional)</Label>
                  <Input
                    id="glAccount"
                    value={formData.glAccount}
                    onChange={(e) => handleInputChange('glAccount', e.target.value)}
                    placeholder="Enter GL account code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Input
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    placeholder="Additional remarks"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveEFTEntry}>
                  {editingEntry ? 'Update Entry' : 'Save Entry'}
                </Button>
                {editingEntry && (
                  <Button variant="outline" onClick={resetForm}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent EFT Entries */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent EFT Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {eftEntries.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No EFT entries recorded</p>
                ) : (
                  eftEntries.map(entry => (
                    <div key={entry.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{entry.referenceNumber}</span>
                        <Badge className={getStatusBadgeColor(entry.status)}>
                          {entry.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.payerName}
                      </div>
                      <div className="text-sm font-medium">
                        {entry.currency} {entry.amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.bankName} | {entry.depositDate}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editEntry(entry)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EFT Entries Table */}
      {eftEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All EFT Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eftEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono">{entry.referenceNumber}</TableCell>
                    <TableCell>{entry.depositDate}</TableCell>
                    <TableCell>
                      <div>{entry.payerName}</div>
                      {entry.payerId && (
                        <div className="text-xs text-muted-foreground">{entry.payerId}</div>
                      )}
                    </TableCell>
                    <TableCell>{entry.bankName}</TableCell>
                    <TableCell>{entry.currency} {entry.amount.toFixed(2)}</TableCell>
                    <TableCell>{entry.category}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(entry.status)}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editEntry(entry)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteEntry(entry.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EFTEntry;