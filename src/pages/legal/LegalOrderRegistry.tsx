import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalOrders, useCreateOrder, useUpdateOrder, useApproveOrder, usePublishOrder } from '@/hooks/useLegalOrders';
import { useLegalAuth } from '@/contexts/LegalAuthContext';
import { useLegalCases } from '@/hooks/useLegalCases';
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
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  CheckCircle,
  Send,
  Eye,
  Edit,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  'Draft': 'bg-neutral-100 text-neutral-800',
  'Under Review': 'bg-indigo-100 text-indigo-800',
  'Approved': 'bg-teal-100 text-teal-800',
  'Published': 'bg-green-100 text-green-800',
};

export default function LegalOrderRegistry() {
  const navigate = useNavigate();
  const { signOut, hasAnyRole } = useLegalAuth();
  const [filters, setFilters] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isDraftOpen, setIsDraftOpen] = useState(false);

  const { data: orders, isLoading } = useLegalOrders(filters);
  const { data: cases } = useLegalCases();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const approveOrder = useApproveOrder();
  const publishOrder = usePublishOrder();

  const canPublish = hasAnyRole(['Supervisor', 'Admin']);
  const canDraft = hasAnyRole(['LegalOfficer', 'Supervisor', 'Admin']);

  // Draft form state
  const [draftForm, setDraftForm] = useState({
    case_id: '',
    findings: '',
    directives: '',
    compliance_due: '',
  });

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleApplyFilters = () => {
    const newFilters: any = {};
    if (statusFilter) newFilters.status = [statusFilter];
    if (caseTypeFilter) newFilters.case_type = caseTypeFilter;
    if (searchQuery) newFilters.search = searchQuery;
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setCaseTypeFilter('');
    setSearchQuery('');
    setFilters({});
  };

  const handleDraftFormChange = (field: string, value: any) => {
    setDraftForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateDraft = async () => {
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

  const handleApprove = async (id: string) => {
    if (confirm('Approve this order for publication?')) {
      await approveOrder.mutateAsync(id);
    }
  };

  const handlePublish = async (id: string) => {
    if (confirm('Publish this order? This action will assign an order number and cannot be undone.')) {
      await publishOrder.mutateAsync(id);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/legal/cases')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Cases
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Main Menu
            </Button>
            <h1 className="text-3xl font-bold">Order Registry</h1>
          </div>
          <div className="flex gap-2">
            {canDraft && (
              <Button onClick={() => setIsDraftOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Draft Order
              </Button>
            )}
            <Button variant="outline" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
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
                    <Input
                      placeholder="Order number, findings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
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
                    <Button onClick={handleApplyFilters} className="flex-1">Apply Filters</Button>
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
            <CardTitle>Orders</CardTitle>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Case Type</TableHead>
                    <TableHead>Published On</TableHead>
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
                          {order.legal_cases?.number || 'N/A'}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.legal_cases?.case_type || 'N/A'}</TableCell>
                      <TableCell>
                        {order.published_at ? format(new Date(order.published_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {order.status === 'Draft' && canDraft && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Edit functionality
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {order.status === 'Under Review' && canPublish && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(order.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          {order.status === 'Approved' && canPublish && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handlePublish(order.id)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Publish
                            </Button>
                          )}
                          {order.status === 'Published' && (
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // View details
                            }}
                          >
                            <Eye className="h-3 w-3" />
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
                {canDraft && (
                  <Button onClick={() => setIsDraftOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Order
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Draft Order Dialog */}
        <Dialog open={isDraftOpen} onOpenChange={setIsDraftOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Draft Order</DialogTitle>
              <DialogDescription>Create a new order draft for a case</DialogDescription>
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
                  placeholder="Enter the findings of the tribunal"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="directives">Directives *</Label>
                <Textarea
                  id="directives"
                  value={draftForm.directives}
                  onChange={(e) => handleDraftFormChange('directives', e.target.value)}
                  placeholder="Enter the directives and remedies ordered"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compliance_due">Compliance Due Date</Label>
                <Input
                  id="compliance_due"
                  type="date"
                  value={draftForm.compliance_due}
                  onChange={(e) => handleDraftFormChange('compliance_due', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDraftOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDraft} disabled={createOrder.isPending}>
                  {createOrder.isPending ? 'Creating...' : 'Create Draft'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
