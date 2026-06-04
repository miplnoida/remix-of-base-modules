/**
 * Formula Configuration — Manage formula templates
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBnFormulaTemplates } from '@/hooks/bn/useBnConfig';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnEmptyState, BnFilterBar } from '@/components/bn/shared';

export default function FormulaConfiguration() {
  const [search, setSearch] = useState('');
  const { data: formulas = [], isLoading } = useBnFormulaTemplates();

  const filtered = formulas.filter((f: any) =>
    !search || f.formula_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.formula_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PermissionWrapper moduleName="bn_configuration">
      <div className="space-y-6 p-6">
        <PageHeader
          title="Formula Templates"
          subtitle="Reusable calculation formula library"
          breadcrumbs={[
            { label: 'Benefit Management', href: '/bn/claims' },
            { label: 'Configuration' },
            { label: 'Formula Templates' },
          ]}
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Library screen — formulas are attached inside Product Catalog</AlertTitle>
          <AlertDescription>
            Formula Templates are reusable calculation building blocks. To assign a formula to a benefit
            product, open Product Catalog → select the product version → Calculation tab.
          </AlertDescription>
        </Alert>


        <Card>
          <CardHeader className="pb-3">
            <BnFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search formulas..."
              filters={[]}
              actions={
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Formula
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <BnEmptyState type="loading" />
            ) : filtered.length === 0 ? (
              <BnEmptyState type={search ? 'no-results' : 'empty'} title="No formula templates" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Expression</TableHead>
                    <TableHead className="w-[60px]">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-sm">{f.formula_code}</TableCell>
                      <TableCell className="font-medium text-sm">{f.formula_name}</TableCell>
                      <TableCell><Badge variant="outline">{f.formula_type || '—'}</Badge></TableCell>
                      <TableCell className="max-w-[300px] truncate font-mono text-xs text-muted-foreground">{f.expression || '—'}</TableCell>
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
