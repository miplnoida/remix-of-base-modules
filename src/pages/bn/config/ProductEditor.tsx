import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Plus, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBnProduct, useCreateBnProduct, useUpdateBnProduct, useBnProductVersions, useCreateBnProductVersion } from '@/hooks/bn/useBnProduct';
import { useBnSchemes, useBnBranches } from '@/hooks/bn/useBnConfig';
import { BN_CATEGORY_LABELS, BN_PRODUCT_STATUS_LABELS } from '@/types/bn';
import type { BnProduct, BnProductVersion, BnProductStatus } from '@/types/bn';
import { EligibilityRulesTab } from '@/components/bn/config/EligibilityRulesTab';
import { CalculationRulesTab } from '@/components/bn/config/CalculationRulesTab';
import { TimelineRulesTab } from '@/components/bn/config/TimelineRulesTab';
import { DocumentRulesTab } from '@/components/bn/config/DocumentRulesTab';
import { WorkflowTab } from '@/components/bn/config/WorkflowTab';
import { ScreenTemplateTab } from '@/components/bn/config/ScreenTemplateTab';
import { InteractionRulesTab } from '@/components/bn/config/InteractionRulesTab';
import { OverridePoliciesTab } from '@/components/bn/config/OverridePoliciesTab';
import { VersionHistoryTab } from '@/components/bn/config/VersionHistoryTab';
import { PreviewTab } from '@/components/bn/config/PreviewTab';

const statusBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary', PENDING_APPROVAL: 'outline', ACTIVE: 'default', SUSPENDED: 'destructive', ARCHIVED: 'outline',
};

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';

  const { data: existingProduct, isLoading } = useBnProduct(id);
  const { data: versions = [] } = useBnProductVersions(isNew ? undefined : id);
  const { data: schemes = [] } = useBnSchemes();
  const { data: branches = [] } = useBnBranches();
  const createMutation = useCreateBnProduct();
  const updateMutation = useUpdateBnProduct();
  const createVersionMutation = useCreateBnProductVersion();

  const [form, setForm] = useState<Partial<BnProduct>>({
    benefit_code: '', benefit_name: '', description: '', category: 'SHORT_TERM',
    branch: 'GENERAL', payment_type: 'PERIODIC', country_code: 'KN', status: 'DRAFT', sort_order: 0,
  });
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();

  // Reset form and version when product id changes
  useEffect(() => {
    setForm({
      benefit_code: '', benefit_name: '', description: '', category: 'SHORT_TERM',
      branch: 'GENERAL', payment_type: 'PERIODIC', country_code: 'KN', status: 'DRAFT', sort_order: 0,
    });
    setSelectedVersionId(undefined);
  }, [id]);

  useEffect(() => {
    if (existingProduct) setForm(existingProduct);
  }, [existingProduct]);

  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(versions[0].id);
    }
  }, [versions, selectedVersionId]);

  const handleSave = async () => {
    if (!form.benefit_code || !form.benefit_name) {
      toast({ title: 'Validation Error', description: 'Code and Name are required.', variant: 'destructive' });
      return;
    }
    try {
      if (isNew) {
        const created = await createMutation.mutateAsync(form);
        toast({ title: 'Success', description: 'Benefit product created.' });
        navigate(`/bn/config/products/${created.id}`);
      } else {
        await updateMutation.mutateAsync({ id: id!, updates: form });
        toast({ title: 'Success', description: 'Benefit product updated.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to save.', variant: 'destructive' });
    }
  };

  const handleCreateVersion = async () => {
    if (!id || isNew) return;
    const nextNum = versions.length > 0 ? Math.max(...versions.map((v: BnProductVersion) => v.version_number)) + 1 : 1;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const created = await createVersionMutation.mutateAsync({ product_id: id, version_number: nextNum, status: 'DRAFT', effective_from: today, version_label: `V${nextNum}` });
      setSelectedVersionId(created.id);
      toast({ title: 'Success', description: `Version ${nextNum} created.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to create version.', variant: 'destructive' });
    }
  };

  const updateField = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

  if (!isNew && isLoading) {
    return <div className="flex min-h-[400px] items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  const activeVersion = versions.find((v: BnProductVersion) => v.id === selectedVersionId);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bn/config/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {isNew ? 'Create Benefit Product' : form.benefit_name}
              </h1>
              {!isNew && form.status && (
                <Badge variant={statusBadge[form.status] || 'outline'}>
                  {BN_PRODUCT_STATUS_LABELS[form.status as BnProductStatus] || form.status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isNew ? 'Define a new configurable benefit product' : `Code: ${form.benefit_code} · ${BN_CATEGORY_LABELS[form.category || ''] || form.category}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="outline" onClick={handleCreateVersion} className="gap-2">
              <Plus className="h-4 w-4" /> New Version
            </Button>
          )}
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </div>

      {/* Version Selector */}
      {!isNew && versions.length > 0 && (
        <Card>
          <CardContent className="flex items-center gap-4 py-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Active Version:</Label>
            <Select value={selectedVersionId || '__none__'} onValueChange={v => setSelectedVersionId(v === '__none__' ? undefined : v)}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select version</SelectItem>
                {versions.map((v: BnProductVersion) => (
                  <SelectItem key={v.id} value={v.id}>
                    V{v.version_number} — {v.effective_from} {v.effective_to ? `to ${v.effective_to}` : '(open)'} [{v.status}]
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeVersion && (
              <Badge variant={statusBadge[activeVersion.status] || 'outline'}>
                {BN_PRODUCT_STATUS_LABELS[activeVersion.status as BnProductStatus] || activeVersion.status}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="definition" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="definition">Definition</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="eligibility" disabled={isNew}>Eligibility</TabsTrigger>
          <TabsTrigger value="calculation" disabled={isNew}>Calculation</TabsTrigger>
          <TabsTrigger value="timelines" disabled={isNew}>Timelines</TabsTrigger>
          <TabsTrigger value="documents" disabled={isNew}>Documents</TabsTrigger>
          <TabsTrigger value="workflow" disabled={isNew}>Workflow</TabsTrigger>
          <TabsTrigger value="screens" disabled={isNew}>Screens</TabsTrigger>
          <TabsTrigger value="interactions" disabled={isNew}>Interactions</TabsTrigger>
          <TabsTrigger value="overrides" disabled={isNew}>Overrides</TabsTrigger>
          <TabsTrigger value="preview" disabled={isNew}>Preview</TabsTrigger>
        </TabsList>

        {/* Definition Tab */}
        <TabsContent value="definition" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Definition</CardTitle>
              <CardDescription>Core product identity and classification</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Benefit Code *</Label>
                <Input value={form.benefit_code || ''} onChange={e => updateField('benefit_code', e.target.value.toUpperCase())} placeholder="e.g. SICK" maxLength={20} disabled={!isNew} />
              </div>
              <div className="space-y-2">
                <Label>Benefit Name *</Label>
                <Input value={form.benefit_name || ''} onChange={e => updateField('benefit_name', e.target.value)} placeholder="Sickness Benefit" />
              </div>
              <div className="space-y-2">
                <Label>Scheme</Label>
                <Select value={form.scheme_id || '__none__'} onValueChange={v => updateField('scheme_id', v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select scheme" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {schemes.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.scheme_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={form.branch_id || '__none__'} onValueChange={v => updateField('branch_id', v === '__none__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category || 'SHORT_TERM'} onValueChange={v => updateField('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BN_CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={form.payment_type || 'PERIODIC'} onValueChange={v => updateField('payment_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERIODIC">Periodic</SelectItem>
                    <SelectItem value="LUMP_SUM">Lump Sum</SelectItem>
                    <SelectItem value="BOTH">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country Code</Label>
                <Input value={form.country_code || 'KN'} onChange={e => updateField('country_code', e.target.value.toUpperCase())} maxLength={3} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status || 'DRAFT'} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BN_PRODUCT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order ?? 0} onChange={e => updateField('sort_order', parseInt(e.target.value) || 0)} />
              </div>
              <div className="col-span-full space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description || ''} onChange={e => updateField('description', e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="mt-6">
          <VersionHistoryTab productId={isNew ? undefined : id} versions={versions} onCreateVersion={handleCreateVersion} />
        </TabsContent>

        <TabsContent value="eligibility" className="mt-6">
          <EligibilityRulesTab versionId={selectedVersionId} />
        </TabsContent>

        <TabsContent value="calculation" className="mt-6">
          <CalculationRulesTab versionId={selectedVersionId} />
        </TabsContent>

        <TabsContent value="timelines" className="mt-6">
          <TimelineRulesTab versionId={selectedVersionId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentRulesTab productId={isNew ? undefined : id} />
        </TabsContent>

        <TabsContent value="workflow" className="mt-6">
          <WorkflowTab versionId={selectedVersionId} />
        </TabsContent>

        <TabsContent value="screens" className="mt-6">
          <ScreenTemplateTab versionId={selectedVersionId} />
        </TabsContent>

        <TabsContent value="interactions" className="mt-6">
          <InteractionRulesTab productId={isNew ? undefined : id} />
        </TabsContent>

        <TabsContent value="overrides" className="mt-6">
          <OverridePoliciesTab productId={isNew ? undefined : id} />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <PreviewTab productId={isNew ? undefined : id} versionId={selectedVersionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
