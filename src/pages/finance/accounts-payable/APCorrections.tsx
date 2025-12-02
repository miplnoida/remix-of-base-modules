import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { Search, Plus, Eye, AlertTriangle, CheckCircle, RotateCcw, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import { accountsPayableService } from '@/services/accountsPayableService';
import { APCorrection } from '@/types/accountsPayable';

const correctionTypes = [
  { value: 'WRONG_PAYEE', label: 'Wrong Payee Name' },
  { value: 'WRONG_AMOUNT', label: 'Wrong Amount' },
  { value: 'CLAIM_REVOKED', label: 'Claim Revoked' },
  { value: 'WRONG_BANK', label: 'Wrong Bank Account' },
  { value: 'LOST_CHECK_REPRINT', label: 'Lost Check Reprint' },
  { value: 'OTHER', label: 'Other' }
];

const APCorrections: React.FC = () => {
  const { toast } = useToast();
  const [corrections, setCorrections] = useState<APCorrection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<APCorrection | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    originalItemId: '',
    correctionType: 'WRONG_AMOUNT' as APCorrection['correctionType'],
    description: '',
    originalAmount: 0,
    correctedAmount: 0
  });

  useEffect(() => {
    loadCorrections();
  }, []);

  const loadCorrections = async () => {
    setLoading(true);
    const data = await accountsPayableService.getCorrections();
    setCorrections(data);
    setLoading(false);
  };

  const handleCreateCorrection = async () => {
    try {
      await accountsPayableService.createCorrection({
        originalItemId: formData.originalItemId,
        correctionType: formData.correctionType,
        description: formData.description,
        originalAmount: formData.originalAmount,
        correctedAmount: formData.correctedAmount,
        requestedBy: 'current-user',
        requestedByName: 'Current User'
      });
      
      toast({
        title: 'Correction Request Created',
        description: 'The correction request has been submitted for approval.'
      });
      
      setShowCreateDialog(false);
      loadCorrections();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create correction request.',
        variant: 'destructive'
      });
    }
  };

  const filteredCorrections = corrections.filter(c => {
    const matchesSearch = c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    pending: corrections.filter(c => c.status === 'PENDING').length,
    approved: corrections.filter(c => c.status === 'APPROVED').length,
    completed: corrections.filter(c => c.status === 'COMPLETED').length,
    rejected: corrections.filter(c => c.status === 'REJECTED').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="AP Corrections & Exceptions"
        subtitle="Manage payment corrections and exceptions"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Accounts Payable', href: '/finance/accounts-payable' },
          { label: 'Corrections' }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{statusCounts.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{statusCounts.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <RotateCcw className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{statusCounts.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{statusCounts.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search corrections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Correction
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Corrections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Correction Requests</CardTitle>
          <CardDescription>View and manage payment corrections</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Original Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Original Amount</TableHead>
                <TableHead className="text-right">Corrected Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredCorrections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">No corrections found</TableCell>
                </TableRow>
              ) : (
                filteredCorrections.map((correction) => (
                  <TableRow key={correction.id}>
                    <TableCell className="font-medium">{correction.originalItemId.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {correctionTypes.find(t => t.value === correction.correctionType)?.label || correction.correctionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{correction.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(correction.originalAmount)}</TableCell>
                    <TableCell className="text-right">
                      {correction.correctedAmount ? formatCurrency(correction.correctedAmount) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          correction.status === 'COMPLETED' ? 'default' :
                          correction.status === 'APPROVED' ? 'default' :
                          correction.status === 'REJECTED' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {correction.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{correction.requestedByName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(correction.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { setSelectedCorrection(correction); setShowDetailDialog(true); }}
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

      {/* Create Correction Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Correction Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Original Item ID</Label>
              <Input
                value={formData.originalItemId}
                onChange={(e) => setFormData({ ...formData, originalItemId: e.target.value })}
                placeholder="Enter original AP item ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Correction Type</Label>
              <Select 
                value={formData.correctionType} 
                onValueChange={(v: any) => setFormData({ ...formData, correctionType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {correctionTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Original Amount</Label>
                <Input
                  type="number"
                  value={formData.originalAmount}
                  onChange={(e) => setFormData({ ...formData, originalAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Corrected Amount</Label>
                <Input
                  type="number"
                  value={formData.correctedAmount}
                  onChange={(e) => setFormData({ ...formData, correctedAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the reason for correction..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateCorrection}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Correction Detail</DialogTitle>
          </DialogHeader>
          {selectedCorrection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Type</label>
                  <p className="font-medium">
                    {correctionTypes.find(t => t.value === selectedCorrection.correctionType)?.label}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <Badge variant={selectedCorrection.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {selectedCorrection.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Original Amount</label>
                  <p className="font-medium">{formatCurrency(selectedCorrection.originalAmount)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Corrected Amount</label>
                  <p className="font-medium">
                    {selectedCorrection.correctedAmount ? formatCurrency(selectedCorrection.correctedAmount) : '-'}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Description</label>
                <p className="p-2 bg-muted rounded">{selectedCorrection.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Requested By</label>
                  <p className="font-medium">{selectedCorrection.requestedByName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedCorrection.requestedAt).toLocaleString()}
                  </p>
                </div>
                {selectedCorrection.approvedBy && (
                  <div>
                    <label className="text-sm text-muted-foreground">Approved By</label>
                    <p className="font-medium">{selectedCorrection.approvedByName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCorrection.approvedAt ? new Date(selectedCorrection.approvedAt).toLocaleString() : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default APCorrections;
