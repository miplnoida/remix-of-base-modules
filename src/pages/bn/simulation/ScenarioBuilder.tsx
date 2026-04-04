import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FlaskConical, Save, Loader2 } from 'lucide-react';
import { useBnProducts, useBnProductVersions } from '@/hooks/bn/useBnProduct';
import { useCreateSimScenario } from '@/hooks/bn/useBnSimulation';
import { toast } from 'sonner';

export default function ScenarioBuilder() {
  const navigate = useNavigate();
  const { data: products } = useBnProducts();
  const [productId, setProductId] = useState('');
  const { data: versions } = useBnProductVersions(productId || undefined);
  const [versionId, setVersionId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createScenario = useCreateSimScenario();

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Scenario name is required'); return; }
    if (!productId) { toast.error('Please select a product'); return; }
    try {
      const result = await createScenario.mutateAsync({
        scenario_name: name.trim(),
        description: description.trim() || null,
        product_id: productId,
        product_version_id: versionId || null,
        country_code: 'KN',
        status: 'DRAFT',
      });
      toast.success('Scenario created');
      navigate(`/bn/simulation/${result.id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create scenario');
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation banner */}
      <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-center gap-3">
        <FlaskConical className="h-5 w-5 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Simulation Mode — Non-Production</p>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bn/simulation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Simulation Scenario</h1>
          <p className="text-sm text-muted-foreground">Configure a test scenario to run against existing product rules</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Details</CardTitle>
          <CardDescription>Define the scope and inputs for this simulation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scenario Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sickness Benefit - Edge Case #1" />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value="KN — St. Kitts & Nevis" disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What are you testing?" rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={productId || '__none__'} onValueChange={v => { setProductId(v === '__none__' ? '' : v); setVersionId(''); }}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Select —</SelectItem>
                  {(products || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.benefit_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product Version</Label>
              <Select value={versionId || '__none__'} onValueChange={v => setVersionId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select version" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Latest Active —</SelectItem>
                  {(versions || []).map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>v{v.version_number} ({v.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => navigate('/bn/simulation')}>Cancel</Button>
            <Button onClick={handleSave} disabled={createScenario.isPending} className="gap-2">
              {createScenario.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Create Scenario
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
