/**
 * Screen Metadata Setup — Manage screen templates and field metadata
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Monitor, Type } from 'lucide-react';
import { useBnScreenTemplates, useBnFieldMetadata } from '@/hooks/bn/useBnConfig';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnEmptyState, BnFilterBar, BnScreenRoleBanner } from '@/components/bn/shared';

export default function ScreenMetadataSetup() {
  const [search, setSearch] = useState('');
  const { data: screens = [], isLoading: screensLoading } = useBnScreenTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const { data: fields = [], isLoading: fieldsLoading } = useBnFieldMetadata(selectedTemplateId);

  const filteredScreens = screens.filter((s: any) =>
    !search || s.template_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFields = fields.filter((f: any) =>
    !search || f.field_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.field_label?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PermissionWrapper moduleName="bn_configuration">
      <div className="space-y-6 p-6">
        <PageHeader
          title="Screen & Field Metadata"
          subtitle="Configure dynamic intake screens and field definitions per product"
          breadcrumbs={[
            { label: 'Benefit Management', href: '/bn/claims' },
            { label: 'Configuration' },
            { label: 'Screen Setup' },
          ]}
        />

        <Tabs defaultValue="screens" className="w-full">
          <TabsList>
            <TabsTrigger value="screens" className="gap-1.5"><Monitor className="h-3.5 w-3.5" /> Screen Templates</TabsTrigger>
            <TabsTrigger value="fields" className="gap-1.5"><Type className="h-3.5 w-3.5" /> Field Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="screens" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <BnFilterBar
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Search screen templates..."
                  filters={[]}
                  actions={
                    <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Template</Button>
                  }
                />
              </CardHeader>
              <CardContent className="p-0">
                {screensLoading ? (
                  <BnEmptyState type="loading" />
                ) : filteredScreens.length === 0 ? (
                  <BnEmptyState type={search ? 'no-results' : 'empty'} title="No screen templates" description="Screen templates define the layout and sections of benefit intake forms." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template Name</TableHead>
                        <TableHead>Sections</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[60px]">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScreens.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4 text-muted-foreground" />
                              {s.template_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{Array.isArray(s.sections) ? s.sections.length : 0} sections</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{s.description || '—'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <BnFilterBar
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Search fields..."
                  filters={[]}
                  actions={
                    <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Field</Button>
                  }
                />
              </CardHeader>
              <CardContent className="p-0">
                {fieldsLoading ? (
                  <BnEmptyState type="loading" />
                ) : filteredFields.length === 0 ? (
                  <BnEmptyState type={search ? 'no-results' : 'empty'} title="No field metadata" description="Field metadata defines the fields that appear on benefit intake screens." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Visible</TableHead>
                        <TableHead className="w-[60px]">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFields.map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-mono text-sm">{f.field_name}</TableCell>
                          <TableCell className="text-sm">{f.field_label}</TableCell>
                          <TableCell><Badge variant="outline">{f.field_type || 'text'}</Badge></TableCell>
                          <TableCell><Switch checked={f.is_required} disabled /></TableCell>
                          <TableCell><Switch checked={f.is_visible !== false} disabled /></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
