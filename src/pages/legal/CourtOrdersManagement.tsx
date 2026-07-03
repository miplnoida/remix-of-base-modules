/** @deprecated Legal V1 legacy — retired 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. Not routed / not linked from canonical UI. */
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gavel, FileText, DollarSign, AlertTriangle, ShieldCheck, Eye, ArrowRightLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LgDataGrid, type LgColumnDef, type LgRowAction, type LgToolbarFilter } from "@/components/legal/grid";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { formatDateForDisplay } from "@/lib/format-config";
import {
  LG_ORDER_STATUSES,
  LG_ORDER_STATUS_LABEL,
  allowedNextLgOrderStatuses,
} from "@/services/legal/lgOrderStateMachine";
import { LgOrderStatusDialog } from "@/components/legal/lg/LgOrderStatusDialog";

const sb = supabase as any;

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  FILED: "secondary",
  GRANTED: "secondary",
  ACTIVE: "default",
  COMPLIED: "default",
  BREACHED: "destructive",
  CLOSED: "outline",
};

const CourtOrdersManagement = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [statusFor, setStatusFor] = useState<any | null>(null);

  const { data: orderTypes = [] } = useLgReference("LG_ORDER_TYPE");

  const { data: orders = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["lg_order_all", typeFilter, statusFilter],
    queryFn: async () => {
      let q = sb
        .from("lg_order")
        .select("*, lg_case:lg_case_id (lg_case_no, summary, status_code), lg_hearing:hearing_id (id, hearing_date)")
        .order("issued_date", { ascending: false })
        .limit(1000);
      if (typeFilter) q = q.eq("order_type_code", typeFilter);
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const typeLabel = (c: string) => orderTypes.find((t) => t.code === c)?.label ?? c;

  const stats = useMemo(() => {
    const total = orders.length;
    const amount = orders.reduce((s: number, o: any) => s + (Number(o.ordered_amount) || 0), 0);
    const active = orders.filter((o: any) => o.status === "ACTIVE").length;
    const breached = orders.filter((o: any) => o.status === "BREACHED").length;
    const complied = orders.filter((o: any) => o.status === "COMPLIED").length;
    return { total, amount, active, breached, complied };
  }, [orders]);

  const columns: LgColumnDef<any>[] = useMemo(() => [
    { key: "order_no", header: "Order No", accessor: (o) => o.order_no, sortable: true },
    { key: "case", header: "Case", accessor: (o) => (
        <button className="text-primary hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/legal/lg/cases/${o.lg_case_id}`); }}>
          {o.lg_case?.lg_case_no ?? "—"}
        </button>
      ) },
    { key: "type", header: "Type", accessor: (o) => <Badge variant="outline">{typeLabel(o.order_type_code)}</Badge> },
    { key: "court", header: "Court", accessor: (o) => o.issued_by_court ?? "—" },
    { key: "issued_date", header: "Order Date", accessor: (o) => o.issued_date ? formatDateForDisplay(o.issued_date) : "—", sortable: true },
    { key: "compliance_date", header: "Compliance By", accessor: (o) => o.compliance_date ? formatDateForDisplay(o.compliance_date) : "—" },
    { key: "amount", header: "Amount", align: "right", accessor: (o) => o.ordered_amount != null ? `EC$${Number(o.ordered_amount).toLocaleString()}` : "—" },
    { key: "status", header: "Status", accessor: (o) => <Badge variant={statusVariant[o.status] ?? "outline"}>{LG_ORDER_STATUS_LABEL[o.status as keyof typeof LG_ORDER_STATUS_LABEL] ?? o.status}</Badge> },
  ], [orderTypes, navigate]);

  const rowActions: LgRowAction<any>[] = [
    {
      key: "open",
      label: "Open case",
      icon: <Eye className="h-4 w-4" />,
      onClick: (o) => navigate(`/legal/lg/cases/${o.lg_case_id}`),
    },
    {
      key: "status",
      label: "Change status",
      icon: <ArrowRightLeft className="h-4 w-4" />,
      onClick: (o) => {
        if (allowedNextLgOrderStatuses(o.status).length === 0) { toast.info("Order is in a terminal status"); return; }
        setStatusFor(o);
      },
    },
  ];

  const toolbarFilters: LgToolbarFilter[] = [
    {
      key: "order_type",
      label: "Type",
      value: typeFilter,
      onChange: (v) => setTypeFilter(v || undefined),
      options: [{ value: "", label: "All types" }, ...orderTypes.map((t) => ({ value: t.code, label: t.label }))],
    },
    {
      key: "status",
      label: "Status",
      value: statusFilter,
      onChange: (v) => setStatusFilter(v || undefined),
      options: [{ value: "", label: "All statuses" }, ...LG_ORDER_STATUSES.map((s) => ({ value: s, label: LG_ORDER_STATUS_LABEL[s] }))],
    },
  ];

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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Orders</CardTitle><Gavel className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Ordered</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">EC${stats.amount.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.active}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Complied</CardTitle><ShieldCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.complied}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Breached</CardTitle><AlertTriangle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{stats.breached}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Orders Registry</CardTitle></CardHeader>
        <CardContent>
          {isError ? (
            <div className="border border-destructive/40 rounded p-4 text-sm text-destructive">
              Failed to load orders: {(error as any)?.message ?? "Unknown error"}
            </div>
          ) : (
            <LgDataGrid
              id="orders.registry"
              data={orders}
              columns={columns}
              getRowId={(o: any) => o.id}
              isLoading={isLoading}
              rowActions={rowActions}
              toolbarFilters={toolbarFilters}
              onRefresh={() => refetch()}
              searchPlaceholder="Search order / case / court…"
              emptyMessage="No orders match the current filters."
            />
          )}
          <p className="text-xs text-muted-foreground mt-3">To record a new order, open the case and use the Orders / Judgments tab.</p>
        </CardContent>
      </Card>

      <LgOrderStatusDialog open={!!statusFor} onOpenChange={(o) => !o && setStatusFor(null)} order={statusFor} caseId={statusFor?.lg_case_id} />
    </div>
  );
};

export default CourtOrdersManagement;
