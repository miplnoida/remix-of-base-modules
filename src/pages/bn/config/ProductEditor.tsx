import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBnProduct, useCreateBnProduct, useUpdateBnProduct } from '@/hooks/bn/useBnProduct';
import type { BnProduct } from '@/types/bn';

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';

  const { data: existingProduct, isLoading } = useBnProduct(id);
  const createMutation = useCreateBnProduct();
  const updateMutation = useUpdateBnProduct();

  const [form, setForm] = useState<Partial<BnProduct>>({
    benefit_code: '',
    benefit_name: '',
    description: '',
    category: 'SHORT_TERM',
    branch: 'GENERAL',
    payment_type: 'PERIODIC',
    country_code: 'KN',
    status: 'DRAFT',
    sort_order: 0,
  });

  useEffect(() => {
    if (existingProduct) {
      setForm(existingProduct);
    }
  }, [existingProduct]);

  const handleSave = async () => {
    if (!form.benefit_code || !form.benefit_name) {
      toast({ title: 'Validation Error', description: 'Code and Name are required.', variant: 'destructive' });
      return;
    }
    try {
      if (isNew) {
        await createMutation.mutateAsync(form);
        toast({ title: 'Success', description: 'Benefit product created.' });
      } else {
        await updateMutation.mutateAsync({ id: id!, updates: form });
        toast({ title: 'Success', description: 'Benefit product updated.' });
      }
      navigate('/bn/config/products');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to save product.', variant: 'destructive' });
    }
  };

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (!isNew && isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bn/config/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              {isNew ? 'Create Benefit Product' : `Edit: ${form.benefit_name}`}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isNew ? 'Define a new benefit product and its rules' : `Code: ${form.benefit_code}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/bn/config/products')}>Cancel</Button>
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="definition" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="definition">Definition</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="calculation">Calculation</TabsTrigger>
          <TabsTrigger value="timelines">Timelines</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Definition Tab */}
        <TabsContent value="definition" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Product Definition</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Benefit Code *</Label>
                <Input value={form.benefit_code || ''} onChange={(e) => updateField('benefit_code', e.target.value.toUpperCase())} placeholder="e.g. SICK" maxLength={20} disabled={!isNew} />
              </div>
              <div className="space-y-2">
                <Label>Benefit Name *</Label>
                <Input value={form.benefit_name || ''} onChange={(e) => updateField('benefit_name', e.target.value)} placeholder="Sickness Benefit" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category || 'SHORT_TERM'} onValueChange={(v) => updateField('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHORT_TERM">Short-Term</SelectItem>
                    <SelectItem value="LONG_TERM">Long-Term</SelectItem>
                    <SelectItem value="NON_CONTRIBUTORY">Non-Contributory</SelectItem>
                    <SelectItem value="GRANT">Grant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={form.branch || 'GENERAL'} onValueChange={(v) => updateField('branch', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="EMPLOYMENT_INJURY">Employment Injury</SelectItem>
                    <SelectItem value="PENSION">Pension</SelectItem>
                    <SelectItem value="ASSISTANCE">Assistance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={form.payment_type || 'PERIODIC'} onValueChange={(v) => updateField('payment_type', v)}>
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
                <Input value={form.country_code || 'KN'} onChange={(e) => updateField('country_code', e.target.value.toUpperCase())} maxLength={5} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status || 'DRAFT'} onValueChange={(v) => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order ?? 0} onChange={(e) => updateField('sort_order', parseInt(e.target.value) || 0)} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description || ''} onChange={(e) => updateField('description', e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Placeholder tabs */}
        <TabsContent value="eligibility" className="mt-6">
          <Card><CardHeader><CardTitle>Eligibility Rules</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Configure eligibility rules for this benefit product. Save the product first to configure version-specific rules.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="calculation" className="mt-6">
          <Card><CardHeader><CardTitle>Calculation Rules</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Configure calculation formulas and rate tables. Save the product first to configure version-specific rules.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="timelines" className="mt-6">
          <Card><CardHeader><CardTitle>Timeline Rules</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Configure waiting periods, durations, and deadlines. Save the product first.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="documents" className="mt-6">
          <Card><CardHeader><CardTitle>Required Documents</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Configure required documents for claim intake. Save the product first.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="workflow" className="mt-6">
          <Card><CardHeader><CardTitle>Workflow Configuration</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Configure approval workflow and maker-checker rules. Save the product first.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="preview" className="mt-6">
          <Card><CardHeader><CardTitle>Preview & Test</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Preview the product configuration and test calculations with sample data.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
