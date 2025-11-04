import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalCases } from '@/hooks/useLegalCases';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search as SearchIcon,
  Filter,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Share2,
} from 'lucide-react';
import { format } from 'date-fns';

interface OrderFilters {
  search: string;
  caseType: string;
  orderType: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  employer: string;
}

// Final statuses that indicate a completed case
const FINAL_STATUSES = ['Order Issued', 'Judgment Delivered', 'Closed - Compliant', 'Closed - Non-Compliant'];

const STATUS_COLORS: Record<string, string> = {
  'Order Issued': 'bg-blue-500/10 text-blue-700 border-blue-200',
  'Judgment Delivered': 'bg-purple-500/10 text-purple-700 border-purple-200',
  'Closed - Compliant': 'bg-green-500/10 text-green-700 border-green-200',
  'Closed - Non-Compliant': 'bg-red-500/10 text-red-700 border-red-200',
};

export default function LegalOrderRegistry() {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    caseType: 'all',
    orderType: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    employer: 'all',
  });
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(filters);

  const { data: cases, isLoading } = useLegalCases();

  // Filter cases to only show those with final statuses
  const finalizedCases = useMemo(() => {
    if (!cases) return [];
    
    // Mock data for demonstration - showing cases with final orders
    const casesWithOrders = cases
      .filter(c => FINAL_STATUSES.includes(c.status))
      .map(c => ({
        ...c,
        orderNumber: `ORD-2025-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        orderDate: c.updated_at || c.created_at,
        orderType: c.case_type === 'Prosecution' ? 'Judgment Order' : c.case_type === 'Compliance' ? 'Compliance Order' : 'Settlement Order',
        employer: c.title.includes('Caribbean Resort') ? 'Caribbean Resort Ltd' : c.title.includes('ABC') ? 'ABC Construction' : 'N/A',
        totalDue: Math.floor(Math.random() * 200000) + 50000,
        outstanding: Math.floor(Math.random() * 100000),
      }));

    return casesWithOrders;
  }, [cases]);

  // Apply filters to the finalized cases
  const filteredOrders = useMemo(() => {
    return finalizedCases.filter(order => {
      // Search filter
      if (appliedFilters.search) {
        const searchLower = appliedFilters.search.toLowerCase();
        const matchesSearch = 
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.number.toLowerCase().includes(searchLower) ||
          order.title.toLowerCase().includes(searchLower) ||
          order.employer.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Case Type filter
      if (appliedFilters.caseType !== 'all' && order.case_type !== appliedFilters.caseType) return false;

      // Order Type filter
      if (appliedFilters.orderType !== 'all' && order.orderType !== appliedFilters.orderType) return false;

      // Status filter
      if (appliedFilters.status !== 'all' && order.status !== appliedFilters.status) return false;

      // Employer filter
      if (appliedFilters.employer !== 'all' && order.employer !== appliedFilters.employer) return false;

      // Date range filter
      if (appliedFilters.dateFrom && new Date(order.orderDate) < new Date(appliedFilters.dateFrom)) return false;
      if (appliedFilters.dateTo && new Date(order.orderDate) > new Date(appliedFilters.dateTo)) return false;

      return true;
    });
  }, [finalizedCases, appliedFilters]);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    const emptyFilters: OrderFilters = {
      search: '',
      caseType: 'all',
      orderType: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      employer: 'all',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const handleView = (caseId: string) => {
    navigate(`/legal/cases/${caseId}`);
  };

  const handleDownload = (orderNumber: string) => {
    console.log('Downloading order:', orderNumber);
    // TODO: Implement actual download functionality
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Order Registry</h1>
        <p className="text-muted-foreground mt-2">View final orders and judgments for closed cases</p>
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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Order number, case number, title, employer..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Case Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Case Type</label>
                  <Select value={filters.caseType} onValueChange={(v) => setFilters({ ...filters, caseType: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Prosecution">Prosecution</SelectItem>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="Appeal">Appeal</SelectItem>
                      <SelectItem value="Recovery">Recovery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Order Type */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Order Type</label>
                  <Select value={filters.orderType} onValueChange={(v) => setFilters({ ...filters, orderType: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Order Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Order Types</SelectItem>
                      <SelectItem value="Judgment Order">Judgment Order</SelectItem>
                      <SelectItem value="Settlement Order">Settlement Order</SelectItem>
                      <SelectItem value="Compliance Order">Compliance Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Order Issued">Order Issued</SelectItem>
                      <SelectItem value="Judgment Delivered">Judgment Delivered</SelectItem>
                      <SelectItem value="Closed - Compliant">Closed - Compliant</SelectItem>
                      <SelectItem value="Closed - Non-Compliant">Closed - Non-Compliant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Order Date From</label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Order Date To</label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  />
                </div>

                {/* Employer */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Employer/Respondent</label>
                  <Select value={filters.employer} onValueChange={(v) => setFilters({ ...filters, employer: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Employers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employers</SelectItem>
                      <SelectItem value="Caribbean Resort Ltd">Caribbean Resort Ltd</SelectItem>
                      <SelectItem value="ABC Construction">ABC Construction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
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
        <CardHeader>
          <CardTitle>Final Orders ({filteredOrders.length} records)</CardTitle>
          <CardDescription>Orders and judgments for cases with final status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Case Number</TableHead>
                    <TableHead>Case Title</TableHead>
                    <TableHead>Case Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order/Judgment Date</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead className="text-right">Total Due</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Updated On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">
                        <button
                          onClick={() => handleView(order.id)}
                          className="text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleView(order.id)}
                          className="text-primary hover:underline font-medium"
                        >
                          {order.number}
                        </button>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {order.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {order.case_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'} border whitespace-nowrap`}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(order.orderDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{order.employer}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${order.totalDue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${order.outstanding.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.updated_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(order.id)}
                            title="View"
                            aria-label={`View order ${order.orderNumber}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(order.orderNumber)}
                            title="Download"
                            aria-label={`Download order ${order.orderNumber}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Share"
                            aria-label={`Share order ${order.orderNumber}`}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-2">No final orders available</p>
              <p className="text-sm text-muted-foreground">
                Orders will appear here once cases reach a final status
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
