import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye } from 'lucide-react';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { useBnProducts } from '@/hooks/bn/useBnProduct';
import { BN_PRODUCT_STATUS_LABELS } from '@/types/bn';
import type { BnProduct, BnProductStatus } from '@/types/bn';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';

const statusVariant: Record<BnProductStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  PENDING_APPROVAL: 'outline',
  ACTIVE: 'default',
  SUSPENDED: 'destructive',
  ARCHIVED: 'outline',
};

export default function ProductCatalog() {
  const navigate = useNavigate();
  const { data: products = [], isLoading, refetch } = useBnProducts();

  const columns: BNColumnDef<BnProduct>[] = [
    { accessorKey: 'benefit_code', header: 'Code', meta: { label: 'Code', pinLeft: true, width: 140 }, cell: ({ getValue }) => <span className="font-mono">{String(getValue() ?? '')}</span> },
    { accessorKey: 'benefit_name', header: 'Name', meta: { label: 'Name', width: 280 }, cell: ({ getValue }) => <span className="font-medium">{String(getValue() ?? '')}</span> },
    { accessorKey: 'category', header: 'Category', meta: { label: 'Category', width: 140 } },
    { accessorKey: 'branch', header: 'Branch', meta: { label: 'Branch', width: 140 } },
    { accessorKey: 'payment_type', header: 'Payment', meta: { label: 'Payment', width: 120 } },
    { accessorKey: 'country_code', header: 'Country', meta: { label: 'Country', width: 90 } },
    {
      accessorKey: 'status',
      header: 'Status',
      meta: { label: 'Status', width: 140 },
      cell: ({ getValue }) => {
        const s = getValue<BnProductStatus>();
        return <Badge variant={statusVariant[s] || 'outline'}>{BN_PRODUCT_STATUS_LABELS[s] || s}</Badge>;
      },
    },
  ];

  const summary = [
    { label: 'Total', value: products.length, tone: 'default' as const },
    { label: 'Active', value: products.filter(p => p.status === 'ACTIVE').length, tone: 'success' as const },
    { label: 'Draft', value: products.filter(p => p.status === 'DRAFT').length, tone: 'warning' as const },
    { label: 'Pending', value: products.filter(p => p.status === 'PENDING_APPROVAL').length, tone: 'info' as const },
    { label: 'Suspended', value: products.filter(p => p.status === 'SUSPENDED').length, tone: 'danger' as const },
    { label: 'Archived', value: products.filter(p => p.status === 'ARCHIVED').length, tone: 'muted' as const },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Benefit Product Catalog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure all rules and requirements for each benefit product — eligibility, calculation, documents, workflow, screens, timelines, interactions, and overrides.
        </p>
      </div>

      <BnScreenRoleBanner
        role="product-assembly"
        description="This is the central Product Assembly workbench. For each product version, configure eligibility, calculation formulas, required documents, service documents, medical policy, workflow, transition fallback, screen/field template, workbasket routing, escalation policy, reason code usage and communications. All reusable building blocks are selected from the libraries — they are not redefined here."
      />

      <BNDataGrid
        id="bn.product-catalog"
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchPlaceholder="Search by code, name, category…"
        summary={summary}
        defaultSort={[{ id: 'benefit_code', desc: false }]}
        onCreate={() => navigate('/bn/config/products/new')}
        onRefresh={() => refetch()}
        onRowClick={(p) => navigate(`/bn/config/products/${p.id}`)}
        rowActions={[
          { key: 'view', label: 'View', icon: <Eye className="h-3.5 w-3.5" />, onClick: (p) => navigate(`/bn/config/products/${p.id}`) },
          { key: 'edit', label: 'Edit', icon: <Edit className="h-3.5 w-3.5" />, onClick: (p) => navigate(`/bn/config/products/${p.id}`) },
        ]}
        exportFilename="bn_product_catalog"
        emptyMessage="No benefit products configured yet. Click Create New to get started."
      />
    </div>
  );
}
