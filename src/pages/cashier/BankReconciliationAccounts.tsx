import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Calculator,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReconciliationAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  glAccount: string;
  lastReconciled: string;
  status: 'reconciled' | 'pending' | 'discrepancy';
  bookBalance: number;
  bankBalance: number;
  difference: number;
  currency: string;
}

interface ReconciliationItem {
  id: string;
  date: string;
  description: string;
  reference: string;
  bookAmount: number;
  bankAmount: number;
  status: 'matched' | 'unmatched' | 'discrepancy';
}

const BankReconciliationAccounts = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ReconciliationAccount | null>(null);

  const [accounts] = useState<ReconciliationAccount[]>([
    {
      id: '1',
      accountName: 'SSS Operating Account',
      accountNumber: '1234567890',
      bankName: 'Republic Bank Trinidad',
      glAccount: '1010',
      lastReconciled: '2024-01-14',
      status: 'reconciled',
      bookBalance: 2450000.50,
      bankBalance: 2450000.50,
      difference: 0,
      currency: 'TTD'
    },
    {
      id: '2',
      accountName: 'SSS Payroll Account',
      accountNumber: '0987654321',
      bankName: 'First Citizens Bank',
      glAccount: '1020',
      lastReconciled: '2024-01-10',
      status: 'discrepancy',
      bookBalance: 850000.75,
      bankBalance: 852500.75,
      difference: 2500.00,
      currency: 'TTD'
    },
    {
      id: '3',
      accountName: 'SSS Investment Account',
      accountNumber: '5678901234',
      bankName: 'Scotiabank Trinidad',
      glAccount: '1030',
      lastReconciled: '2023-12-31',
      status: 'pending',
      bookBalance: 125000.00,
      bankBalance: 124800.00,
      difference: -200.00,
      currency: 'USD'
    }
  ]);

  const [reconciliationItems] = useState<ReconciliationItem[]>([
    {
      id: '1',
      date: '2024-01-15',
      description: 'Contribution Payment - Employer 001',
      reference: 'TXN001234',
      bookAmount: 15000.00,
      bankAmount: 15000.00,
      status: 'matched'
    },
    {
      id: '2',
      date: '2024-01-14',
      description: 'Bank Service Charge',
      reference: 'BSC001',
      bookAmount: 0.00,
      bankAmount: -25.00,
      status: 'unmatched'
    },
    {
      id: '3',
      date: '2024-01-14',
      description: 'Check Deposit - Employer 002',
      reference: 'CHK5678',
      bookAmount: 8500.00,
      bankAmount: 8500.00,
      status: 'matched'
    }
  ]);

  const filteredAccounts = accounts.filter(account =>
    account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.accountNumber.includes(searchTerm)
  );

  const handleSaveAccount = () => {
    toast({
      title: "Account Updated",
      description: "Reconciliation account has been updated successfully.",
    });
    setIsDialogOpen(false);
    setEditingAccount(null);
  };

  const handleReconcile = (accountId: string) => {
    toast({
      title: "Reconciliation Started",
      description: "Bank reconciliation process has been initiated for this account.",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reconciled':
        return 'default';
      case 'discrepancy':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'default';
      case 'unmatched':
        return 'secondary';
      case 'discrepancy':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation Accounts</h1>
          <p className="text-muted-foreground">Manage and monitor bank reconciliation processes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit' : 'Add'} Reconciliation Account</DialogTitle>
              <DialogDescription>
                Configure account for bank reconciliation monitoring.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account-name">Account Name</Label>
                <Input id="account-name" placeholder="SSS Operating Account" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-number">Account Number</Label>
                <Input id="account-number" placeholder="1234567890" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-name">Bank Name</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="republic">Republic Bank Trinidad</SelectItem>
                    <SelectItem value="fcb">First Citizens Bank</SelectItem>
                    <SelectItem value="scotia">Scotiabank Trinidad</SelectItem>
                    <SelectItem value="rbc">RBC Royal Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gl-account">GL Account</Label>
                <Input id="gl-account" placeholder="1010" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TTD">TTD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveAccount}>
                <Save className="h-4 w-4 mr-2" />
                Save Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">
              {accounts.filter(a => a.status === 'reconciled').length} reconciled
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discrepancies</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter(a => a.status === 'discrepancy').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                accounts.reduce((sum, a) => sum + Math.abs(a.difference), 0),
                'TTD'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Absolute variance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reconciliation Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((accounts.filter(a => a.status === 'reconciled').length / accounts.length) * 100)}%
            </div>
            <Progress 
              value={(accounts.filter(a => a.status === 'reconciled').length / accounts.length) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation Items</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Accounts</CardTitle>
              <CardDescription>
                Monitor bank reconciliation status for all accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Details</TableHead>
                    <TableHead>Balances</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Last Reconciled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{account.accountName}</div>
                          <div className="text-sm text-muted-foreground">{account.accountNumber}</div>
                          <div className="text-xs text-muted-foreground">{account.bankName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Book: </span>
                            {formatCurrency(account.bookBalance, account.currency)}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Bank: </span>
                            {formatCurrency(account.bankBalance, account.currency)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${account.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(account.difference, account.currency)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{account.lastReconciled}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(account.status) as any}>
                          {account.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReconcile(account.id)}
                          >
                            Reconcile
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingAccount(account);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Items</CardTitle>
              <CardDescription>
                Review individual reconciliation items and discrepancies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Book Amount</TableHead>
                    <TableHead>Bank Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.reference}</Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.bookAmount, 'TTD')}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.bankAmount, 'TTD')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getItemStatusColor(item.status) as any}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Reports</CardTitle>
              <CardDescription>
                Generate and download reconciliation reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Daily Reconciliation Report</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Monthly Reconciliation Summary</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Outstanding Items Report</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Variance Analysis Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BankReconciliationAccounts;