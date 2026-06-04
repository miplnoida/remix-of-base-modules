/**
 * Rule Configuration — CRUD for eligibility, calculation, and timeline rules
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Search, BookOpen, Calculator, Clock, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBnRuleGroups } from '@/hooks/bn/useBnConfig';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { PageHeader } from '@/components/common/PageHeader';
import { BnEmptyState, BnFilterBar } from '@/components/bn/shared';

export default function RuleConfiguration() {
  const [search, setSearch] = useState('');
  const { data: ruleGroups = [], isLoading } = useBnRuleGroups();

  const filtered = ruleGroups.filter((rg: any) =>
    !search || rg.group_name?.toLowerCase().includes(search.toLowerCase()) ||
    rg.group_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PermissionWrapper moduleName="bn_configuration">
      <div className="space-y-6 p-6">
        <PageHeader
          title="Rule Group Library"
          subtitle="Reusable classification labels for organizing product rules"
          breadcrumbs={[
            { label: 'Benefit Management', href: '/bn/claims' },
            { label: 'Configuration' },
            { label: 'Rule Group Library' },
          ]}
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Library screen — not a rule editor</AlertTitle>
          <AlertDescription>
            Rule Groups are classification labels used to organize rules inside Product Catalog.
            Actual benefit rules (eligibility, calculation, timeline) are defined inside Product Catalog
            against a specific product version.
          </AlertDescription>
        </Alert>


        <Tabs defaultValue="groups" className="w-full">
          <TabsList>
            <TabsTrigger value="groups" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Rule Groups</TabsTrigger>
            <TabsTrigger value="eligibility" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Eligibility</TabsTrigger>
            <TabsTrigger value="calculation" className="gap-1.5"><Calculator className="h-3.5 w-3.5" /> Calculation</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="mt-6">
            <Card>
              <CardHeader className="pb-3">
                <BnFilterBar
                  search={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Search rule groups..."
                  filters={[]}
                  actions={
                    <Button size="sm" className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Add Group
                    </Button>
                  }
                />
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <BnEmptyState type="loading" />
                ) : filtered.length === 0 ? (
                  <BnEmptyState type={search ? 'no-results' : 'empty'} title="No rule groups" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[60px]">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((rg: any) => (
                        <TableRow key={rg.id}>
                          <TableCell className="font-mono text-sm">{rg.group_code}</TableCell>
                          <TableCell className="font-medium text-sm">{rg.group_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{rg.country_code || 'Global'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{rg.description}</TableCell>
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

          <TabsContent value="eligibility" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <BnEmptyState
                  type="empty"
                  title="Eligibility Rules"
                  description="Eligibility rules are configured per product version in the Product Editor."
                  action={{ label: 'Go to Product Catalog', onClick: () => window.location.href = '/bn/config/products' }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculation" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <BnEmptyState
                  type="empty"
                  title="Calculation Rules"
                  description="Calculation rules are configured per product version in the Product Editor."
                  action={{ label: 'Go to Product Catalog', onClick: () => window.location.href = '/bn/config/products' }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <BnEmptyState
                  type="empty"
                  title="Timeline Rules"
                  description="Timeline rules (waiting periods, durations) are configured per product version in the Product Editor."
                  action={{ label: 'Go to Product Catalog', onClick: () => window.location.href = '/bn/config/products' }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
