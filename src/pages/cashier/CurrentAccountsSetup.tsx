import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Edit, Trash2, Save, X, Building, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchCode: string;
  accountType: string;
  currency: string;
  glAccount: string;
  isDefault: boolean;
  status: 'active' | 'inactive';
  balance: number;
}

const CurrentAccountsSetup = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const [accounts] = useState<BankAccount[]>([
    {
      id: '1',
      accountName: 'SSS Operating Account',
      accountNumber: '1234567890',
      bankName: 'Republic Bank Trinidad',
      branchCode: '001',
      accountType: 'Current',
      currency: 'TTD',
      glAccount: '1010',
      isDefault: true,
      status: 'active',
      balance: 2450000.50
    },
    {
      id: '2',
      accountName: 'SSS Payroll Account',
      accountNumber: '0987654321',
      bankName: 'First Citizens Bank',
      branchCode: '002',
      accountType: 'Current',
      currency: 'TTD',
      glAccount: '1020',
      isDefault: false,
      status: 'active',
      balance: 850000.75
    },
    {
      id: '3',
      accountName: 'SSS Investment Account',
      accountNumber: '5678901234',
      bankName: 'Scotiabank Trinidad',
      branchCode: '003',
      accountType: 'Investment',
      currency: 'USD',
      glAccount: '1030',
      isDefault: false,
      status: 'inactive',
      balance: 125000.00
    }
  ]);

  const filteredAccounts = accounts.filter(account =>
    account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.accountNumber.includes(searchTerm)
  );

  const handleSaveAccount = () => {
    toast({
      title: "Account Saved",
      description: "Bank account configuration has been saved successfully.",
    });
    setIsDialogOpen(false);
    setEditingAccount(null);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-TT', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Current Accounts Setup</h1>
          <p className="text-muted-foreground">Manage bank accounts for cashier operations</p>
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
              <DialogTitle>{editingAccount ? 'Edit' : 'Add'} Bank Account</DialogTitle>
              <DialogDescription>
                Configure bank account details for cashier operations.
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
                    <SelectItem value="cibc">CIBC FirstCaribbean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-code">Branch Code</Label>
                <Input id="branch-code" placeholder="001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-type">Account Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="trust">Trust</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TTD">TTD - Trinidad & Tobago Dollar</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gl-account">GL Account</Label>
                <Input id="gl-account" placeholder="1010" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 col-span-2">
                <Switch id="is-default" />
                <Label htmlFor="is-default">Set as default account</Label>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">
              {accounts.filter(a => a.status === 'active').length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance (TTD)</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                accounts
                  .filter(a => a.currency === 'TTD' && a.status === 'active')
                  .reduce((sum, a) => sum + a.balance, 0),
                'TTD'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Active TTD accounts only
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Account</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {accounts.find(a => a.isDefault)?.accountName || 'None set'}
            </div>
            <p className="text-xs text-muted-foreground">
              Primary cashier account
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>
            Manage bank accounts for cashier and payment operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by account name, bank, or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Details</TableHead>
                <TableHead>Bank & Branch</TableHead>
                <TableHead>Type & Currency</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {account.accountName}
                        {account.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{account.accountNumber}</div>
                      <div className="text-xs text-muted-foreground">GL: {account.glAccount}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{account.bankName}</div>
                      <div className="text-sm text-muted-foreground">Branch: {account.branchCode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Badge variant="outline">{account.accountType}</Badge>
                      <div className="text-sm text-muted-foreground mt-1">{account.currency}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.status === 'active' ? 'default' : 'secondary'}>
                      {account.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrentAccountsSetup;