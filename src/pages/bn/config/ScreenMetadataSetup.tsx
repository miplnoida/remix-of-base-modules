/**
 * Screen Metadata Setup — Manage reusable screen templates and smart field metadata.
 * This screen is the canonical Screen & Field Library. It only creates reusable
 * templates and field metadata — product-specific eligibility, documents, and
 * calculations belong to the Product Catalogue.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Monitor, Trash2 } from 'lucide-react';
import { useBnScreenTemplates, useDeleteBnScreenTemplate } from '@/hooks/bn/useBnConfig';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnScreenRoleBanner } from '@/components/bn/shared';
import { SMART_FIELD_TYPES } from '@/services/bn/registries';
import { ScreenBuilder } from '@/components/bn/config/ScreenBuilder';
import { ScreenTemplateUsageCell } from '@/components/bn/config/ScreenTemplateUsageCell';
import { useToast } from '@/hooks/use-toast';
import { BNDataGrid, type BNColumnDef } from '@/components/bn/grid';

export default function ScreenMetadataSetup() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const { data: screens = [], isLoading, refetch } = useBnScreenTemplates();
  const deleteTemplate = useDeleteBnScreenTemplate();
  const [editing, setEditing] = useState<any | null>(null);

  const filtered = screens.filter((s: any) =>
    !search || s.template_name?.toLowerCase().includes(search.toLowerCase()) || s.template_code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (s: any) => {
    if (!confirm(`Delete screen template "${s.template_name}"? This will also remove its fields.`)) return;
    try {
      await deleteTemplate.mutateAsync(s.id);
      toast({ title: 'Deleted', description: `Template "${s.template_name}" removed.` });
      refetch();
    } catch (err: any) {
      toast({ title: 'Cannot delete', description: err?.message ?? 'Template is in use by a product version.', variant: 'destructive' });
    }
  };

  return (
    <PermissionWrapper moduleName="bn_configuration">
      <div className="space-y-6 p-6">
        <PageHeader
          title="Screen & Field Library"
          subtitle="Reusable screen templates and smart field blocks consumed by Product Catalogue"
          breadcrumbs={[
            { label: 'Benefit Management', href: '/bn/claims' },
            { label: 'Configuration' },
            { label: 'Screen & Field Library' },
          ]}
        />

        <BnScreenRoleBanner
          role="library"
          productAssemblyHint
          description="Build reusable screen templates by adding sections and smart fields. Product Catalogue → Screens tab assigns them to product versions; Preview and Intake render the assigned template."
        />

        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Smart Field Type Registry</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1.5">
              {SMART_FIELD_TYPES.map(t => (
                <Badge key={t.key} variant="outline" className="text-xs">{t.label}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {editing ? (
          <ScreenBuilder template={editing} onClose={() => { setEditing(null); refetch(); }} />
        ) : (
          <BNDataGrid
            id="bn.screen-templates"
            data={screens as any[]}
            isLoading={isLoading}
            searchPlaceholder="Search screen templates..."
            onCreate={() => setEditing({})}
            onRefresh={() => refetch()}
            defaultSort={[{ id: 'template_code', desc: false }]}
            exportFilename="bn_screen_templates"
            emptyMessage="No screen templates configured."
            columns={[
              { accessorKey: 'template_code', header: 'Template Code', meta: { label: 'Template Code', pinLeft: true, width: 160 }, cell: ({ getValue }) => <span className="font-mono text-xs">{String(getValue() ?? '')}</span> },
              { accessorKey: 'template_name', header: 'Name', meta: { label: 'Name', width: 260 }, cell: ({ getValue }) => (
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  {String(getValue() ?? '')}
                </div>
              ) },
              { accessorKey: 'layout_type', header: 'Layout', meta: { label: 'Layout', width: 120 }, cell: ({ getValue }) => <Badge variant="outline" className="text-xs">{String(getValue() ?? '')}</Badge> },
              { id: 'sections', header: 'Sections', meta: { label: 'Sections', width: 100 }, accessorFn: (row: any) => Array.isArray(row.sections) ? row.sections.length : 0, cell: ({ getValue }) => <Badge variant="secondary">{String(getValue() ?? 0)}</Badge> },
              { id: 'usage', header: 'Used by', meta: { label: 'Used by', width: 120 }, cell: ({ row }) => <ScreenTemplateUsageCell templateId={(row.original as any).id} /> },
              { accessorKey: 'description', header: 'Description', meta: { label: 'Description', width: 300 }, cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{(getValue() as string) || '—'}</span> },
            ] as BNColumnDef<any>[]}
            rowActions={[
              { key: 'edit', label: 'Edit', icon: <Edit className="h-3.5 w-3.5" />, onClick: (s) => setEditing(s) },
              { key: 'delete', label: 'Delete', icon: <Trash2 className="h-3.5 w-3.5" />, variant: 'destructive', onClick: handleDelete },
            ]}
          />
        )}

      </div>
    </PermissionWrapper>
  );
}
