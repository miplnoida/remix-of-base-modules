import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Building2, ArrowRight, CheckCircle, DollarSign, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  isDefault: boolean;
}

interface AllocationLine {
  id: string;
  accountId: string;
  amount: number;
}

interface CollectionHead {
  id: string;
  name: string;
  amount: number;
  currency: string;
  defaultAccount: string;
  selectedAccount: string;
  allocations: AllocationLine[];
}

interface FundTransfer {
  id: string;
  transferDate: Date;
  totalAmount: number;
  currency: string;
  bankAccount: BankAccount;
  collectionHeads: CollectionHead[];
  status: 'pending' | 'sent' | 'confirmed';
  confirmationNumber?: string;
  notes?: string;
}

const FundsTransfer: React.FC = () => {
  const { toast } = useToast();
  
  const [bankAccounts] = useState<BankAccount[]>([
    {
      id: 'rbc-ec-operating',
      accountName: 'Operating Account - EC$',
      accountNumber: '1234567890',
      bankName: 'Royal Bank of Canada',
      currency: 'EC$',
      isDefault: true
    },
    {
      id: 'rbc-us-operating',
      accountName: 'Operating Account - US$',
      accountNumber: '1234567891',
      bankName: 'Royal Bank of Canada',
      currency: 'US$',
      isDefault: true
    },
    {
      id: 'fcb-ec-levy',
      accountName: 'Levy Collection Account',
      accountNumber: '9876543210',
      bankName: 'First Citizens Bank',
      currency: 'EC$',
      isDefault: false
    },
    {
      id: 'bon-ec-pension',
      accountName: 'Pension Fund Account',
      accountNumber: '5555666677',
      bankName: 'Bank of Nevis',
      currency: 'EC$',
      isDefault: false
    }
  ]);

  const [collectionHeads, setCollectionHeads] = useState<CollectionHead[]>([
    {
      id: 'c3-contributions',
      name: 'C3 Social Security Contributions',
      amount: 8750.50,
      currency: 'EC$',
      defaultAccount: 'rbc-ec-operating',
      selectedAccount: 'rbc-ec-operating',
      allocations: [
        { id: '1', accountId: 'rbc-ec-operating', amount: 8750.50 }
      ]
    },
    {
      id: 'levy-collections',
      name: 'Levy Collections',
      amount: 2500.00,
      currency: 'EC$',
      defaultAccount: 'fcb-ec-levy',
      selectedAccount: 'fcb-ec-levy',
      allocations: [
        { id: '1', accountId: 'fcb-ec-levy', amount: 2500.00 }
      ]
    },
    {
      id: 'rent-payments',
      name: 'Rent Payments',
      amount: 1800.75,
      currency: 'EC$',
      defaultAccount: 'rbc-ec-operating',
      selectedAccount: 'rbc-ec-operating',
      allocations: [
        { id: '1', accountId: 'rbc-ec-operating', amount: 1800.75 }
      ]
    },
    {
      id: 'loan-repayments',
      name: 'Loan Repayments',
      amount: 950.25,
      currency: 'EC$',
      defaultAccount: 'rbc-ec-operating',
      selectedAccount: 'rbc-ec-operating',
      allocations: [
        { id: '1', accountId: 'rbc-ec-operating', amount: 950.25 }
      ]
    },
    {
      id: 'service-fees',
      name: 'Service Fees',
      amount: 325.00,
      currency: 'EC$',
      defaultAccount: 'rbc-ec-operating',
      selectedAccount: 'rbc-ec-operating',
      allocations: [
        { id: '1', accountId: 'rbc-ec-operating', amount: 325.00 }
      ]
    },
    {
      id: 'us-collections',
      name: 'US Dollar Collections',
      amount: 1250.00,
      currency: 'US$',
      defaultAccount: 'rbc-us-operating',
      selectedAccount: 'rbc-us-operating',
      allocations: [
        { id: '1', accountId: 'rbc-us-operating', amount: 1250.00 }
      ]
    }
  ]);

  const [transfers, setTransfers] = useState<FundTransfer[]>([
    {
      id: '1',
      transferDate: new Date('2024-12-24'),
      totalAmount: 12500.00,
      currency: 'EC$',
      bankAccount: bankAccounts[0],
      collectionHeads: [],
      status: 'confirmed',
      confirmationNumber: 'TXN-20241224-001'
    }
  ]);

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedHeads, setSelectedHeads] = useState<string[]>([]);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));

  const updateSelectedAccount = (headId: string, accountId: string) => {
    setCollectionHeads(prev => prev.map(head => 
      head.id === headId ? { ...head, selectedAccount: accountId } : head
    ));
  };

  const addAllocationLine = (headId: string) => {
    setCollectionHeads(prev => prev.map(head => {
      if (head.id === headId) {
        const balance = calculateBalance(head);
        if (balance <= 0) {
          toast({
            title: "Cannot Add Line",
            description: "No remaining balance to allocate.",
            variant: "destructive"
          });
          return head;
        }
        return {
          ...head,
          allocations: [
            ...head.allocations,
            { id: Date.now().toString(), accountId: head.defaultAccount, amount: 0 }
          ]
        };
      }
      return head;
    }));
  };

  const removeAllocationLine = (headId: string, allocationId: string) => {
    setCollectionHeads(prev => prev.map(head => {
      if (head.id === headId) {
        if (head.allocations.length <= 1) {
          toast({
            title: "Cannot Remove",
            description: "At least one allocation line is required.",
            variant: "destructive"
          });
          return head;
        }
        return {
          ...head,
          allocations: head.allocations.filter(a => a.id !== allocationId)
        };
      }
      return head;
    }));
  };

  const updateAllocationAccount = (headId: string, allocationId: string, accountId: string) => {
    setCollectionHeads(prev => prev.map(head => {
      if (head.id === headId) {
        return {
          ...head,
          allocations: head.allocations.map(a =>
            a.id === allocationId ? { ...a, accountId } : a
          )
        };
      }
      return head;
    }));
  };

  const updateAllocationAmount = (headId: string, allocationId: string, amount: number) => {
    setCollectionHeads(prev => prev.map(head => {
      if (head.id === headId) {
        const newAmount = isNaN(amount) ? 0 : amount;
        
        // Calculate current total without this allocation
        const otherAllocationsTotal = head.allocations
          .filter(a => a.id !== allocationId)
          .reduce((sum, a) => sum + a.amount, 0);
        
        // Calculate max allowed for this allocation
        const maxAllowed = head.amount - otherAllocationsTotal;
        
        // Validate and cap the amount
        if (newAmount > maxAllowed) {
          toast({
            title: "Invalid Amount",
            description: `Amount cannot exceed the remaining balance of ${head.currency} ${maxAllowed.toFixed(2)}`,
            variant: "destructive"
          });
          
          return {
            ...head,
            allocations: head.allocations.map(a =>
              a.id === allocationId ? { ...a, amount: maxAllowed } : a
            )
          };
        }
        
        return {
          ...head,
          allocations: head.allocations.map(a =>
            a.id === allocationId ? { ...a, amount: newAmount } : a
          )
        };
      }
      return head;
    }));
  };

  const calculateBalance = (head: CollectionHead): number => {
    const totalAllocated = head.allocations.reduce((sum, a) => sum + a.amount, 0);
    return head.amount - totalAllocated;
  };

  const toggleHeadSelection = (headId: string) => {
    setSelectedHeads(prev => 
      prev.includes(headId) 
        ? prev.filter(id => id !== headId)
        : [...prev, headId]
    );
  };

  const resetToDefaults = () => {
    setCollectionHeads(prev => prev.map(head => ({
      ...head,
      selectedAccount: head.defaultAccount
    })));
    
    toast({
      title: "Reset to Defaults",
      description: "All collection heads have been reset to their default bank accounts.",
    });
  };

  const getSelectedAmount = () => {
    return collectionHeads
      .filter(head => selectedHeads.includes(head.id))
      .reduce((sum, head) => sum + head.amount, 0);
  };

  const getAccountsByTransfer = () => {
    const accountMap = new Map<string, { account: BankAccount; heads: CollectionHead[]; total: number }>();
    
    collectionHeads
      .filter(head => selectedHeads.includes(head.id))
      .forEach(head => {
        const account = bankAccounts.find(acc => acc.id === head.selectedAccount)!;
        const key = `${account.id}-${account.currency}`;
        
        if (!accountMap.has(key)) {
          accountMap.set(key, { account, heads: [], total: 0 });
        }
        
        const entry = accountMap.get(key)!;
        entry.heads.push(head);
        entry.total += head.amount;
      });
    
    return Array.from(accountMap.values());
  };

  const processTransfer = () => {
    if (selectedHeads.length === 0) {
      toast({
        title: "No Collections Selected",
        description: "Please select at least one collection head to transfer.",
        variant: "destructive"
      });
      return;
    }

    const transferGroups = getAccountsByTransfer();
    const newTransfers: FundTransfer[] = transferGroups.map((group, index) => ({
      id: `${Date.now()}-${index}`,
      transferDate: new Date(transferDate),
      totalAmount: group.total,
      currency: group.account.currency,
      bankAccount: group.account,
      collectionHeads: group.heads,
      status: 'pending' as const,
      notes: transferNotes
    }));

    setTransfers(prev => [...newTransfers, ...prev]);
    setTransferDialogOpen(false);
    setSelectedHeads([]);
    setTransferNotes('');

    toast({
      title: "Funds Transfer Initiated",
      description: `${newTransfers.length} transfer(s) created for processing.`,
    });
  };

  const markTransferSent = (transferId: string, confirmationNumber: string) => {
    setTransfers(prev => prev.map(transfer => 
      transfer.id === transferId 
        ? { ...transfer, status: 'sent' as const, confirmationNumber }
        : transfer
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Funds Transfer to Bank</h1>
          <p className="text-muted-foreground">Transfer collection proceeds to designated bank accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Initiate Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Initiate Funds Transfer</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <Label>Transfer Date</Label>
                  <Input 
                    type="date" 
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Transfer Notes</Label>
                  <Textarea
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="Optional notes for this transfer..."
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-3">Select Collection Heads to Transfer</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {collectionHeads.map((head) => (
                      <div 
                        key={head.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedHeads.includes(head.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleHeadSelection(head.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{head.name}</div>
                            <div className="text-sm text-muted-foreground">
                              → {bankAccounts.find(acc => acc.id === head.selectedAccount)?.accountName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{head.currency} {head.amount.toFixed(2)}</div>
                            <input 
                              type="checkbox" 
                              checked={selectedHeads.includes(head.id)}
                              onChange={() => {}}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedHeads.length > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Transfer Summary</h4>
                    {getAccountsByTransfer().map((group, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm">{group.account.accountName}</span>
                        <span className="font-semibold">{group.account.currency} {group.total.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t mt-2 pt-2 flex justify-between items-center font-semibold">
                      <span>Total Selected</span>
                      <span>$ {getSelectedAmount().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={processTransfer} disabled={selectedHeads.length === 0}>
                  Process Transfer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Collection Head Mappings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {collectionHeads.map((head) => {
                const balance = calculateBalance(head);
                return (
                  <div key={head.id} className="p-4 border rounded-lg bg-card">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-medium text-lg">{head.name}</div>
                        <div className="text-2xl font-bold">{head.currency} {head.amount.toFixed(2)}</div>
                      </div>
                      {balance !== 0 && (
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Balance</div>
                          <div className={`text-xl font-bold ${
                            balance < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {head.currency} {balance.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {head.allocations.map((allocation, index) => (
                        <div key={allocation.id} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-xs mb-1">Account</Label>
                            <Select 
                              value={allocation.accountId} 
                              onValueChange={(value) => updateAllocationAccount(head.id, allocation.id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {bankAccounts
                                  .filter(acc => acc.currency === head.currency)
                                  .map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    <div>
                                      <div className="font-medium">{account.accountName}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {account.bankName}
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="w-40">
                            <Label className="text-xs mb-1">Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={head.amount}
                              value={allocation.amount}
                              onChange={(e) => updateAllocationAmount(head.id, allocation.id, parseFloat(e.target.value))}
                              className="text-right font-semibold"
                            />
                          </div>
                          
                          <div className="flex gap-1">
                            {index === head.allocations.length - 1 && balance > 0 && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => addAllocationLine(head.id)}
                                className="h-10 w-10"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                            {head.allocations.length > 1 && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => removeAllocationLine(head.id, allocation.id)}
                                className="h-10 w-10"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {balance !== 0 && (
                      <div className="mt-3 p-2 rounded text-sm text-center">
                        {balance > 0 ? (
                          <span className="text-yellow-600">⚠️ {head.currency} {balance.toFixed(2)} remaining to allocate</span>
                        ) : (
                          <span className="text-red-600">⚠️ Over-allocated by {head.currency} {Math.abs(balance).toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div key={account.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{account.accountName}</div>
                      <div className="text-sm text-muted-foreground">{account.bankName}</div>
                      <div className="text-sm font-mono">{account.accountNumber}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{account.currency}</Badge>
                      {account.isDefault && (
                        <Badge variant="outline" className="ml-1">Default</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Collection Heads</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confirmation</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{transfer.transferDate.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transfer.bankAccount.accountName}</div>
                      <div className="text-sm text-muted-foreground">{transfer.bankAccount.bankName}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {transfer.currency} {transfer.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {transfer.collectionHeads.length} head(s)
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(transfer.status)}>
                      {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {transfer.confirmationNumber || '-'}
                  </TableCell>
                  <TableCell>
                    {transfer.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const confirmation = prompt('Enter confirmation number:');
                          if (confirmation) {
                            markTransferSent(transfer.id, confirmation);
                          }
                        }}
                      >
                        Mark Sent
                      </Button>
                    )}
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

export default FundsTransfer;