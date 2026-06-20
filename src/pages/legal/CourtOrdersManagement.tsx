import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gavel, Eye, FileText, DollarSign, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listAllLgOrders } from "@/services/legal/lgRegistryService";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { formatDateForDisplay } from "@/lib/format-config";

const ALL = "__all__";

const CourtOrdersManagement = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [search, setSearch] = useState("");

  const { data: orderTypes = [] } = useLgReference("LG_ORDER_TYPE");
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["lg_order_all", typeFilter, statusFilter],
    queryFn: () => listAllLgOrders({
      type: typeFilter === ALL ? undefined : typeFilter,
      status: statusFilter === ALL ? undefined : statusFilter,
    }),
  });

  const typeLabel = (c: string) => orderTypes.find(t => t.code === c)?.label ?? c;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter(o =>
      o.order_no?.toLowerCase().includes(s) ||
      o.lg_case?.lg_case_no?.toLowerCase().includes(s) ||
      o.issued_by_court?.toLowerCase().includes(s)
    );
  }, [orders, search]);

  const stats = useMemo(() => ({
    total: orders.length,
    totalAmount: orders.reduce((s, o) => s + (Number(o.ordered_amount) || 0), 0),
    judgments: orders.filter(o => o.order_type_code === "JUDGMENT").length,
    interim: orders.filter(o => o.order_type_code === "INTERIM").length,
  }), [orders]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Court Orders & Judgments"
        subtitle="All orders issued across legal cases"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/lg/dashboard" },
          { label: "Court Orders", href: "/legal/court-orders" },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Ordered</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">EC${stats.totalAmount.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Judgments</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.judgments}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Interim Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.interim}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders Registry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Input placeholder="Search order/case/court..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="md:w-56"><SelectValue placeholder="Order type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All types</SelectItem>
                {orderTypes.map(t => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="ISSUED">Issued</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLIED">Complied</SelectItem>
                <SelectItem value="VACATED">Vacated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Court</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
                ) : filtered.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.order_no}</TableCell>
                    <TableCell>
                      <button className="text-primary hover:underline" onClick={() => navigate(`/legal/lg/cases/${o.lg_case_id}`)}>
                        {o.lg_case?.lg_case_no ?? '—'}
                      </button>
                    </TableCell>
                    <TableCell><Badge variant="outline">{typeLabel(o.order_type_code)}</Badge></TableCell>
                    <TableCell className="text-sm">{o.issued_by_court ?? '—'}</TableCell>
                    <TableCell>{o.issued_date ? formatDateForDisplay(o.issued_date) : '—'}</TableCell>
                    <TableCell className="text-right font-semibold">{o.ordered_amount != null ? `EC$${Number(o.ordered_amount).toLocaleString()}` : '—'}</TableCell>
                    <TableCell><Badge>{o.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/legal/lg/cases/${o.lg_case_id}`)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">To record a new order, open the case and use the Orders tab.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourtOrdersManagement;
