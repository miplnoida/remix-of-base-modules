import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalOrders, useCreateOrder, usePublishOrder, useApproveOrder } from '@/hooks/useLegalOrders';
import { useLegalCases } from '@/hooks/useLegalCases';
import { useLegalAuth } from '@/contexts/LegalAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Home,
  LogOut,
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';

const ORDER_STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-neutral-100 text-neutral-800',
  'Under Review': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-blue-100 text-blue-800',
  'Published': 'bg-green-100 text-green-800',
};

export default function LegalOrderRegistry() {
  const navigate = useNavigate();
  const { signOut, hasAnyRole } = useLegalAuth();
  const [filters, setFilters] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('');

  const { data: orders, isLoading } = useLegalOrders(filters);
  const { data: cases } = useLegalCases();
  const createOrder = useCreateOrder();
  const publishOrder = usePublishOrder();
  const approveOrder = useApproveOrder();

  const [isDraftOpen, setIsDraftOpen] = useState(false);
  const [draftForm, setDraftForm] = useState({
    case_id: '',
    findings: '',
    directives: '',
    compliance_due: '',
  });

  const canPublish = hasAnyRole(['Supervisor', 'Admin']);
  const canApprove = hasAnyRole(['Supervisor', 'Admin']);

  const handleApplyFilters = () => {
    const newFilters: any = { search: searchTerm };
    if (statusFilter && statusFilter !== 'all') newFilters.status = [statusFilter];
    if (caseTypeFilter && caseTypeFilter !== 'all') newFilters.caseType = [caseTypeFilter];
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCaseTypeFilter('');
    setFilters({});
  };

  const handleDraftFormChange = (field: string, value: any) => {
    setDraftForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDraftOrder = async () => {
    if (!draftForm.case_id || !draftForm.findings || !draftForm.directives) {
      return;
    }

    try {
      await createOrder.mutateAsync(draftForm);
      setIsDraftOpen(false);
      setDraftForm({
        case_id: '',
        findings: '',
        directives: '',
        compliance_due: '',
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handlePublish = async (orderId: string) => {
    if (!canPublish) return;
    if (confirm('Are you sure you want to publish this order? This action cannot be undone.')) {
      await publishOrder.mutateAsync(orderId);
    }
  };

  const handleApprove = async (orderId: string) => {
    if (!canApprove) return;
    await approveOrder.mutateAsync(orderId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order Registry</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsDraftOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Draft Order
          </Button>
        </div>
      </div>

        {/* Filters */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle>Search & Filter Orders</CardTitle>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Order number, findings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="bg-popover">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Under Review">Under Review</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Case Type</label>
                    <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
                      <SelectTrigger className="bg-popover">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Prosecution">Prosecution</SelectItem>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                        <SelectItem value="Appeal">Appeal</SelectItem>
                        <SelectItem value="Recovery">Recovery</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={handleApplyFilters} className="flex-1">Apply</Button>
                    <Button variant="outline" onClick={handleClearFilters}>Clear</Button>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Orders Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Orders & Judgments</CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading orders...</div>
            ) : orders && orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Case Number</TableHead>
                    <TableHead>Case Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {order.number || <span className="text-muted-foreground">Draft</span>}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => navigate(`/legal/cases/${order.case_id}`)}
                          className="text-primary hover:underline"
                        >
                          {order.legal_cases?.number}
                        </button>
                      </TableCell>
                      <TableCell>{order.legal_cases?.case_type}</TableCell>
                      <TableCell>
                        <Badge className={ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.published_at ? format(new Date(order.published_at), 'PPP') : '-'}
                      </TableCell>
                      <TableCell>{order.created_by ? 'User' : 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {order.status === 'Draft' && canApprove && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(order.id)}
                              className="gap-1"
                            >
                              <Send className="h-3 w-3" />
                              Review
                            </Button>
                          )}
                          {order.status === 'Approved' && canPublish && (
                            <Button
                              size="sm"
                              onClick={() => handlePublish(order.id)}
                              className="gap-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Publish
                            </Button>
                          )}
                          {order.status === 'Published' && (
                            <Button size="sm" variant="outline" className="gap-1">
                              <Download className="h-3 w-3" />
                              PDF
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="gap-1">
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No orders found</p>
                <Button onClick={() => setIsDraftOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Draft First Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Draft Order Dialog */}
        <Dialog open={isDraftOpen} onOpenChange={setIsDraftOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Draft Order</DialogTitle>
              <DialogDescription>Create a new order for a case</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="case">Case *</Label>
                <Select
                  value={draftForm.case_id}
                  onValueChange={(v) => handleDraftFormChange('case_id', v)}
                >
                  <SelectTrigger id="case" className="bg-popover">
                    <SelectValue placeholder="Select case" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {cases?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.number} - {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="findings">Findings *</Label>
                <Textarea
                  id="findings"
                  value={draftForm.findings}
                  onChange={(e) => handleDraftFormChange('findings', e.target.value)}
                  placeholder="Enter case findings and analysis"
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="directives">Directives/Orders *</Label>
                <Textarea
                  id="directives"
                  value={draftForm.directives}
                  onChange={(e) => handleDraftFormChange('directives', e.target.value)}
                  placeholder="Enter the court's directives and orders"
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compliance">Compliance Due Date</Label>
                <Input
                  id="compliance"
                  type="date"
                  value={draftForm.compliance_due}
                  onChange={(e) => handleDraftFormChange('compliance_due', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDraftOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleDraftOrder} disabled={createOrder.isPending}>
                  {createOrder.isPending ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
