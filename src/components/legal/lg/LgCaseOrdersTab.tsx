import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Gavel, ArrowRightLeft, Link2, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LgDataGrid, type LgColumnDef, type LgRowAction } from "@/components/legal/grid";
import { useLgOrders } from "@/hooks/legal/useLgEntities";
import { useLgReference } from "@/hooks/legal/useLgCases";
import { AddOrderDialog } from "@/components/legal/lg/AddOrderDialog";
import { LgOrderStatusDialog } from "@/components/legal/lg/LgOrderStatusDialog";
import { formatDateForDisplay } from "@/lib/format-config";
import { LG_ORDER_STATUS_LABEL, allowedNextLgOrderStatuses } from "@/services/legal/lgOrderStateMachine";

interface Props {
  lgCaseId: string;
  canCreate: boolean;
  canManage: boolean;
}

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  FILED: "secondary",
  GRANTED: "secondary",
  ACTIVE: "default",
  COMPLIED: "default",
  BREACHED: "destructive",
  CLOSED: "outline",
};

export function LgCaseOrdersTab({ lgCaseId, canCreate, canManage }: Props) {
  const navigate = useNavigate();
  const { data: orders = [], isLoading, isError, error } = useLgOrders(lgCaseId);
  const { data: orderTypes = [] } = useLgReference("LG_ORDER_TYPE");
  const [addOpen, setAddOpen] = useState(false);
  const [statusFor, setStatusFor] = useState<any | null>(null);

  const typeLabel = (c: string) => orderTypes.find((t) => t.code === c)?.label ?? c;

  const columns: LgColumnDef<any>[] = useMemo(() => [
    { key: "order_no", header: "Order No", accessor: (o) => o.order_no, sortable: true },
    { key: "type", header: "Type", accessor: (o) => <Badge variant="outline">{typeLabel(o.order_type_code)}</Badge> },
    { key: "court", header: "Court", accessor: (o) => o.issued_by_court ?? "—" },
    { key: "issued_date", header: "Order Date", accessor: (o) => o.issued_date ? formatDateForDisplay(o.issued_date) : "—", sortable: true },
    { key: "compliance_date", header: "Compliance By", accessor: (o) => o.compliance_date ? formatDateForDisplay(o.compliance_date) : "—" },
    { key: "hearing", header: "Hearing", accessor: (o) => o.lg_hearing?.hearing_date ? formatDateForDisplay(o.lg_hearing.hearing_date) : "—" },
    { key: "amount", header: "Amount", align: "right", accessor: (o) => o.ordered_amount != null ? `EC$${Number(o.ordered_amount).toLocaleString()}` : "—" },
    { key: "status", header: "Status", accessor: (o) => <Badge variant={statusVariant[o.status] ?? "outline"}>{LG_ORDER_STATUS_LABEL[o.status as keyof typeof LG_ORDER_STATUS_LABEL] ?? o.status}</Badge> },
  ], [orderTypes]);

  const rowActions: LgRowAction<any>[] = [
    {
      key: "status",
      label: "Change status",
      icon: <ArrowRightLeft className="h-4 w-4" />,
      onClick: (o) => {
        if (!canManage) { toast.error("You do not have permission to change order status"); return; }
        if (allowedNextLgOrderStatuses(o.status).length === 0) { toast.info("Order is in a terminal status"); return; }
        setStatusFor(o);
      },
    },
    {
      key: "arrangement",
      label: "View payment arrangement",
      icon: <Link2 className="h-4 w-4" />,
      hidden: (o) => !o.payment_arrangement_id,
      onClick: (o) => navigate(`/legal/payment-recovery?caseId=${lgCaseId}&arrangementId=${o.payment_arrangement_id}`),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Gavel className="h-4 w-4" />
          <span>{orders.length} order{orders.length === 1 ? "" : "s"} on record</span>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} disabled={!canCreate} title={!canCreate ? "Read-only role" : undefined}>
          <Plus className="h-4 w-4 mr-1" /> Add Order
        </Button>
      </div>

      {isError ? (
        <div className="border border-destructive/40 rounded p-4 text-sm text-destructive">
          Failed to load orders: {(error as any)?.message ?? "Unknown error"}
        </div>
      ) : (
        <LgDataGrid
          id="case.orders"
          data={orders}
          columns={columns}
          getRowId={(o) => o.id}
          isLoading={isLoading}
          rowActions={rowActions}
          emptyMessage={canCreate ? "No orders yet. Add the first court order or judgment for this case." : "No orders have been recorded for this case."}
        />
      )}

      <AddOrderDialog open={addOpen} onOpenChange={setAddOpen} lgCaseId={lgCaseId} />
      <LgOrderStatusDialog open={!!statusFor} onOpenChange={(o) => !o && setStatusFor(null)} order={statusFor} caseId={lgCaseId} />
    </div>
  );
}
