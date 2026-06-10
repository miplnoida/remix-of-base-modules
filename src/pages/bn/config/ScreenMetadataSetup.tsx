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
          <Card>
            <CardHeader className="pb-3">
              <BnFilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search screen templates..."
                filters={[]}
                actions={
                  <Button size="sm" className="gap-1.5" onClick={() => setEditing({})}>
                    <Plus className="h-3.5 w-3.5" /> Add Template
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <BnEmptyState type="loading" />
              ) : filtered.length === 0 ? (
                <BnEmptyState
                  type={search ? 'no-results' : 'empty'}
                  title="No screen templates"
                  description="Screen templates define the layout, sections and smart fields of benefit intake forms."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Layout</TableHead>
                      <TableHead>Sections</TableHead>
                      <TableHead>Used by</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.template_code}</TableCell>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            {s.template_name}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.layout_type}</Badge></TableCell>
                        <TableCell><Badge variant="secondary">{Array.isArray(s.sections) ? s.sections.length : 0}</Badge></TableCell>
                        <TableCell><ScreenTemplateUsageCell templateId={s.id} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{s.description || '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditing(s)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(s)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PermissionWrapper>
  );
}
