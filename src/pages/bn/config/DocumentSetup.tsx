/**
 * Document Setup — Configure document profiles per product
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, FileCheck, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBnDocumentProfiles } from '@/hooks/bn/useBnConfig';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnEmptyState, BnFilterBar } from '@/components/bn/shared';

export default function DocumentSetup() {
  const [search, setSearch] = useState('');
  const { data: profiles = [], isLoading } = useBnDocumentProfiles();

  const filtered = profiles.filter((p: any) =>
    !search || p.profile_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PermissionWrapper moduleName="bn_configuration">
      <div className="space-y-6 p-6">
        <PageHeader
          title="Document Setup"
          subtitle="Reusable document type and profile library"
          breadcrumbs={[
            { label: 'Benefit Management', href: '/bn/claims' },
            { label: 'Configuration' },
            { label: 'Document Setup' },
          ]}
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Library screen — required documents are set inside Product Catalog</AlertTitle>
          <AlertDescription>
            Document Setup defines reusable document types and profiles. Product-specific document
            requirements are configured in Product Catalog → select the product version → Documents tab.
          </AlertDescription>
        </Alert>


        <Card>
          <CardHeader className="pb-3">
            <BnFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search document profiles..."
              filters={[]}
              actions={
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Profile
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <BnEmptyState type="loading" />
            ) : filtered.length === 0 ? (
              <BnEmptyState type={search ? 'no-results' : 'empty'} title="No document profiles" description="Create a profile to define required documents for benefit claims." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profile Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[60px]">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-muted-foreground" />
                          {p.profile_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate">{p.description || '—'}</TableCell>
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
      </div>
    </PermissionWrapper>
  );
}
