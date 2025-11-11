import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileX, AlertTriangle, CheckCircle, Search, Calendar, RotateCcw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Check {
  id: string;
  checkNumber: string;
  bankName: string;
  payerName: string;
  employerName?: string;
  invoiceReference?: string;
  amount: number;
  currency: string;
  dateReceived: Date;
  status: 'pending' | 'cleared' | 'dishonored' | 'returned';
  receiptNumber: string;
  batchId: string;
  cashierId: string;
  notes?: string;
  returnReason?: string;
  penaltyApplied?: number;
}

const CheckManagement: React.FC = () => {
  const { toast } = useToast();
  const [checks, setChecks] = useState<Check[]>([
    {
      id: "1",
      checkNumber: "001234",
      bankName: "Royal Bank of Canada",
      payerName: "Government of St. Kitts and Nevis",
      employerName: "Government of St. Kitts and Nevis",
      invoiceReference: "INV-2024-001",
      amount: 15000.00,
      currency: "EC$",
      dateReceived: new Date("2024-12-20"),
      status: "cleared",
      receiptNumber: "C3-20241220-0001",
      batchId: "BATCH-001-20241220",
      cashierId: "cashier1"
    },
    {
      id: "2",
      checkNumber: "005678",
      bankName: "First Citizens Bank",
      payerName: "Marriott Resort",
      employerName: "Marriott Resort",
      amount: 8500.00,
      currency: "EC$",
      dateReceived: new Date("2024-12-22"),
      status: "pending",
      receiptNumber: "C3-20241222-0015",
      batchId: "BATCH-002-20241222",
      cashierId: "cashier2"
    },
    {
      id: "3",
      checkNumber: "009876",
      bankName: "Bank of Nevis",
      payerName: "John Smith",
      amount: 450.00,
      currency: "EC$",
      dateReceived: new Date("2024-12-23"),
      status: "dishonored",
      receiptNumber: "MISC-20241223-0008",
      batchId: "BATCH-003-20241223",
      cashierId: "cashier1",
      returnReason: "Insufficient funds",
      penaltyApplied: 50.00
    }
  ]);

  const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'dishonor' | 'return' | 'clear'>('dishonor');
  const [actionForm, setActionForm] = useState({
    reason: '',
    penalty: '',
    notes: ''
  });
  const [selectedCheckIds, setSelectedCheckIds] = useState<Set<string>>(new Set());
  const [bulkActionType, setBulkActionType] = useState<string>('');

  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    bankName: '',
    checkNumber: ''
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    cleared: 'bg-green-100 text-green-800',
    dishonored: 'bg-red-100 text-red-800',
    returned: 'bg-gray-100 text-gray-800'
  };

  const statusIcons = {
    pending: Calendar,
    cleared: CheckCircle,
    dishonored: FileX,
    returned: AlertTriangle
  };

  const handleCheckAction = () => {
    if (!selectedCheck) return;

    const updatedCheck = {
      ...selectedCheck,
      status: actionType === 'clear' ? 'cleared' as const : 
              actionType === 'dishonor' ? 'dishonored' as const : 'returned' as const,
      returnReason: actionForm.reason,
      penaltyApplied: actionForm.penalty ? parseFloat(actionForm.penalty) : undefined,
      notes: actionForm.notes
    };

    setChecks(prev => prev.map(check => 
      check.id === selectedCheck.id ? updatedCheck : check
    ));

    toast({
      title: "Check Updated",
      description: `Check ${selectedCheck.checkNumber} has been ${actionType}ed.`,
    });

    setActionDialogOpen(false);
    setSelectedCheck(null);
    setActionForm({ reason: '', penalty: '', notes: '' });
  };

  const filteredChecks = checks.filter(check => {
    if (filters.status !== 'all' && check.status !== filters.status) return false;
    if (filters.bankName && !check.bankName.toLowerCase().includes(filters.bankName.toLowerCase())) return false;
    if (filters.checkNumber && !check.checkNumber.includes(filters.checkNumber)) return false;
    if (filters.dateFrom && check.dateReceived < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && check.dateReceived > new Date(filters.dateTo)) return false;
    return true;
  });

  const getStatusSummary = () => {
    return {
      total: checks.length,
      pending: checks.filter(c => c.status === 'pending').length,
      cleared: checks.filter(c => c.status === 'cleared').length,
      dishonored: checks.filter(c => c.status === 'dishonored').length,
      returned: checks.filter(c => c.status === 'returned').length,
      totalAmount: checks.filter(c => c.status === 'cleared').reduce((sum, c) => sum + c.amount, 0),
      pendingAmount: checks.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)
    };
  };

  const summary = getStatusSummary();

  // Helper functions to check if selected checks can perform actions
  const canClearSelected = () => {
    if (selectedCheckIds.size === 0) return false;
    return Array.from(selectedCheckIds).some(id => {
      const check = checks.find(c => c.id === id);
      return check?.status === 'pending';
    });
  };

  const canDishonorSelected = () => {
    if (selectedCheckIds.size === 0) return false;
    return Array.from(selectedCheckIds).some(id => {
      const check = checks.find(c => c.id === id);
      return check?.status === 'pending';
    });
  };

  const canReturnSelected = () => {
    if (selectedCheckIds.size === 0) return false;
    return Array.from(selectedCheckIds).some(id => {
      const check = checks.find(c => c.id === id);
      return check?.status === 'cleared' || check?.status === 'dishonored';
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Check Management</h1>
          <p className="text-muted-foreground">Manage check receipts, clearances, and returns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export Report</Button>
          <Button variant="outline">Import Bank Statement</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-sm text-muted-foreground">Total Checks</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-xs">EC$ {summary.pendingAmount.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{summary.cleared}</div>
              <div className="text-sm text-muted-foreground">Cleared</div>
              <div className="text-xs">EC$ {summary.totalAmount.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.dishonored}</div>
              <div className="text-sm text-muted-foreground">Dishonored</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{summary.returned}</div>
              <div className="text-sm text-muted-foreground">Returned</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="dishonored">Dishonored</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date From</Label>
              <Input 
                type="date" 
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date To</Label>
              <Input 
                type="date" 
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input 
                placeholder="Search bank..." 
                value={filters.bankName}
                onChange={(e) => setFilters(prev => ({ ...prev, bankName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Check Number</Label>
              <Input 
                placeholder="Check number..." 
                value={filters.checkNumber}
                onChange={(e) => setFilters(prev => ({ ...prev, checkNumber: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Check Register</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setBulkActionType('clear')}
                disabled={!canClearSelected()}
                className={!canClearSelected() 
                  ? "opacity-50 cursor-not-allowed" 
                  : "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                }
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Clear Check
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setBulkActionType('return')}
                disabled={!canReturnSelected()}
                className={!canReturnSelected() 
                  ? "opacity-50 cursor-not-allowed" 
                  : "bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                }
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Return
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setBulkActionType('dishonor')}
                disabled={!canDishonorSelected()}
                className={!canDishonorSelected() 
                  ? "opacity-50 cursor-not-allowed" 
                  : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                }
              >
                <FileX className="h-4 w-4 mr-2" />
                Dishonor
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedCheckIds.size === filteredChecks.length && filteredChecks.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCheckIds(new Set(filteredChecks.map(c => c.id)));
                      } else {
                        setSelectedCheckIds(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Check #</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChecks.map((check) => {
                const StatusIcon = statusIcons[check.status];
                return (
                  <TableRow key={check.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCheckIds.has(check.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedCheckIds);
                          if (checked) {
                            newSelected.add(check.id);
                          } else {
                            newSelected.delete(check.id);
                          }
                          setSelectedCheckIds(newSelected);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono">{check.checkNumber}</TableCell>
                    <TableCell>{check.bankName}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{check.payerName}</div>
                        {check.employerName && (
                          <div className="text-sm text-muted-foreground">{check.employerName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{check.currency} {check.amount.toFixed(2)}</TableCell>
                    <TableCell>{check.dateReceived.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[check.status]}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {check.status.charAt(0).toUpperCase() + check.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{check.receiptNumber}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {check.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedCheck(check);
                                setActionType('clear');
                                setActionDialogOpen(true);
                              }}
                            >
                              Clear
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => {
                                setSelectedCheck(check);
                                setActionType('dishonor');
                                setActionDialogOpen(true);
                              }}
                            >
                              Dishonor
                            </Button>
                          </>
                        )}
                        {(check.status === 'cleared' || check.status === 'dishonored') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedCheck(check);
                              setActionType('return');
                              setActionDialogOpen(true);
                            }}
                          >
                            Return
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'clear' ? 'Clear Check' : 
               actionType === 'dishonor' ? 'Dishonor Check' : 'Return Check'}
            </DialogTitle>
          </DialogHeader>
          {selectedCheck && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Check Number: {selectedCheck.checkNumber}</div>
                  <div>Amount: {selectedCheck.currency} {selectedCheck.amount.toFixed(2)}</div>
                  <div>Bank: {selectedCheck.bankName}</div>
                  <div>Payer: {selectedCheck.payerName}</div>
                </div>
              </div>

              {(actionType === 'dishonor' || actionType === 'return') && (
                <>
                  <div>
                    <Label htmlFor="reason">Reason *</Label>
                    <Select value={actionForm.reason} onValueChange={(value) => setActionForm(prev => ({ ...prev, reason: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="insufficient_funds">Insufficient Funds</SelectItem>
                        <SelectItem value="account_closed">Account Closed</SelectItem>
                        <SelectItem value="signature_mismatch">Signature Mismatch</SelectItem>
                        <SelectItem value="stale_date">Stale Date</SelectItem>
                        <SelectItem value="stop_payment">Stop Payment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {actionType === 'dishonor' && (
                    <div>
                      <Label htmlFor="penalty">Penalty Amount (Optional)</Label>
                      <Input
                        id="penalty"
                        type="number"
                        step="0.01"
                        value={actionForm.penalty}
                        onChange={(e) => setActionForm(prev => ({ ...prev, penalty: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={actionForm.notes}
                      onChange={(e) => setActionForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional information..."
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckAction}>
              Confirm {actionType === 'clear' ? 'Clear' : actionType === 'dishonor' ? 'Dishonor' : 'Return'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckManagement;