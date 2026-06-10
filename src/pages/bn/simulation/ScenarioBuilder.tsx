import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, FlaskConical, Save, Loader2, AlertTriangle, Info } from 'lucide-react';
import { useBnProducts, useBnProductVersions } from '@/hooks/bn/useBnProduct';
import { useBnCountries, useBnSchemes } from '@/hooks/bn/useBnConfig';
import { useCreateSimScenario, useUpdateSimScenario, useBnSimScenario } from '@/hooks/bn/useBnSimulation';
import { toast } from 'sonner';
import type { BnSimScenarioType, BnSimSourceType } from '@/types/bnSimulation';
import { useSimPermission } from '@/hooks/bn/useSimPermission';
import SimAccessDenied from '@/components/bn/simulation/SimAccessDenied';

const SCENARIO_TYPES: { value: BnSimScenarioType; label: string; desc: string }[] = [
  { value: 'STANDARD', label: 'Standard', desc: 'Normal test scenario for a benefit product' },
  { value: 'EDGE_CASE', label: 'Edge Case', desc: 'Boundary or unusual input combinations' },
  { value: 'REGRESSION', label: 'Regression', desc: 'Verify existing behavior after rule changes' },
  { value: 'COMPARATIVE', label: 'Comparative', desc: 'Compare outputs across versions or configs' },
];

const SOURCE_TYPES: { value: BnSimSourceType; label: string; desc: string }[] = [
  { value: 'MANUAL', label: 'Manual Input', desc: 'Enter all test data manually' },
  { value: 'REPLAY', label: 'Claim Replay', desc: 'Replay a production claim with frozen inputs' },
  { value: 'IMPORT', label: 'Import', desc: 'Load scenario data from a file or preset' },
];

interface FormErrors {
  [key: string]: string;
}

export default function ScenarioBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { canCreate } = useSimPermission();

  // --- Data hooks ---
  const { data: existingScenario, isLoading: loadingScenario } = useBnSimScenario(id);
  const { data: countries } = useBnCountries();
  const [countryCode, setCountryCode] = useState('KN');
  const { data: schemes } = useBnSchemes(countryCode);
  const { data: products } = useBnProducts();
  const [productId, setProductId] = useState('');
  const { data: versions } = useBnProductVersions(productId || undefined);

  // --- Form state ---
  const [scenarioCode, setScenarioCode] = useState('');
  const [scenarioName, setScenarioName] = useState('');
  const [description, setDescription] = useState('');
  const [schemeId, setSchemeId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [scenarioType, setScenarioType] = useState<BnSimScenarioType>('STANDARD');
  const [sourceType, setSourceType] = useState<BnSimSourceType>('MANUAL');
  const [baseClaimRef, setBaseClaimRef] = useState('');
  const [notes, setNotes] = useState('');
  const [inputPayload, setInputPayload] = useState('');

  // --- Validation ---
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // --- Mutations ---
  const createScenario = useCreateSimScenario();
  const updateScenario = useUpdateSimScenario();
  const isSaving = createScenario.isPending || updateScenario.isPending;

  // --- Load existing scenario for edit mode ---
  useEffect(() => {
    if (isEditMode && existingScenario) {
      setScenarioCode(existingScenario.scenario_code || '');
      setScenarioName(existingScenario.scenario_name || '');
      setDescription(existingScenario.description || '');
      setCountryCode(existingScenario.country_code || 'KN');
      setSchemeId(existingScenario.scheme_id || '');
      setProductId(existingScenario.product_id || '');
      setVersionId(existingScenario.product_version_id || '');
      setScenarioType(existingScenario.scenario_type || 'STANDARD');
      setSourceType(existingScenario.source_type || 'MANUAL');
      setBaseClaimRef(existingScenario.base_claim_ref || '');
      setNotes(existingScenario.notes || '');
      setInputPayload(
        existingScenario.input_payload ? JSON.stringify(existingScenario.input_payload, null, 2) : ''
      );
    }
  }, [isEditMode, existingScenario]);

  // --- Clear individual error on change ---
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  // --- Validation ---
  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!scenarioName.trim()) e.scenarioName = 'Scenario name is required';
    if (!productId) e.productId = 'Product is required';
    if (!countryCode) e.countryCode = 'Country is required';
    if (sourceType === 'REPLAY' && !baseClaimRef.trim()) {
      e.baseClaimRef = 'Base claim reference is required for Replay scenarios';
    }
    if (inputPayload.trim()) {
      try { JSON.parse(inputPayload); } catch { e.inputPayload = 'Input payload must be valid JSON'; }
    }
    return e;
  };

  const errorCount = useMemo(() => {
    if (!hasAttemptedSubmit) return 0;
    return Object.keys(validate()).length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAttemptedSubmit, scenarioName, productId, countryCode, sourceType, baseClaimRef, inputPayload]);

  // --- Save ---
  const handleSave = async () => {
    setHasAttemptedSubmit(true);
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      toast.error('Please check the form for valid information!', {
        description: firstError,
        style: { backgroundColor: 'hsl(var(--destructive))', color: 'white', '--description-color': 'white' } as React.CSSProperties,
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
      return;
    }

    let parsedPayload: Record<string, unknown> | null = null;
    if (inputPayload.trim()) {
      try { parsedPayload = JSON.parse(inputPayload); } catch { /* validated above */ }
    }

    const payload = {
      scenario_code: scenarioCode.trim() || null,
      scenario_name: scenarioName.trim(),
      description: description.trim() || null,
      product_id: productId,
      product_version_id: versionId || null,
      scheme_id: schemeId || null,
      country_code: countryCode,
      scenario_type: scenarioType,
      source_type: sourceType,
      input_payload: parsedPayload,
      base_claim_ref: baseClaimRef.trim() || null,
      notes: notes.trim() || null,
      status: 'DRAFT' as const,
    };

    try {
      if (isEditMode && id) {
        await updateScenario.mutateAsync({ id, updates: payload });
        toast.success('Scenario updated');
        navigate(`/bn/simulation/${id}`);
      } else {
        const result = await createScenario.mutateAsync(payload);
        toast.success('Scenario created');
        navigate(`/bn/simulation/${result.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save scenario');
    }
  };

  if (!canCreate) return <SimAccessDenied title="Cannot Create Scenarios" message="You do not have permission to create or edit simulation scenarios." />;

  if (isEditMode && loadingScenario) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simulation banner */}
      <div className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-center gap-3">
        <FlaskConical className="h-5 w-5 text-amber-600" />
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Simulation Mode — Non-Production — Data saved to simulation tables only
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bn/simulation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="t-page-title">
            {isEditMode ? 'Edit Simulation Scenario' : 'New Simulation Scenario'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure a test scenario to run against existing product rules
          </p>
        </div>
        {isEditMode && existingScenario && (
          <Badge variant="outline" className="ml-auto">{existingScenario.status}</Badge>
        )}
      </div>

      {/* Validation summary */}
      {hasAttemptedSubmit && errorCount > 0 && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {errorCount} field{errorCount > 1 ? 's' : ''} need{errorCount === 1 ? 's' : ''} attention
          </p>
        </div>
      )}

      {/* SECTION 1: Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenario Identity</CardTitle>
          <CardDescription>Unique identification for this simulation scenario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scenario Code</Label>
              <Input
                value={scenarioCode}
                onChange={e => { setScenarioCode(e.target.value); clearError('scenarioCode'); }}
                placeholder="e.g. SIM-SB-001"
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground">Optional short code for quick reference</p>
            </div>
            <div className="space-y-2">
              <Label>Scenario Name <span className="text-destructive">*</span></Label>
              <Input
                value={scenarioName}
                onChange={e => { setScenarioName(e.target.value); clearError('scenarioName'); }}
                placeholder="e.g. Sickness Benefit - Edge Case #1"
                maxLength={100}
                className={errors.scenarioName ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.scenarioName && <p className="text-xs text-destructive mt-1">{errors.scenarioName}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the purpose and expected behavior of this scenario..."
              rows={3}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Product & Scheme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product Configuration</CardTitle>
          <CardDescription>Select the benefit product and version to simulate against</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Country <span className="text-destructive">*</span></Label>
              <Select
                value={countryCode || '__none__'}
                onValueChange={v => {
                  const val = v === '__none__' ? '' : v;
                  setCountryCode(val);
                  setSchemeId('');
                  clearError('countryCode');
                }}
              >
                <SelectTrigger className={errors.countryCode ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Select —</SelectItem>
                  {(countries || []).map((c: any) => (
                    <SelectItem key={c.country_code} value={c.country_code}>
                      {c.country_name} ({c.country_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.countryCode && <p className="text-xs text-destructive mt-1">{errors.countryCode}</p>}
            </div>

            <div className="space-y-2">
              <Label>Scheme</Label>
              <Select
                value={schemeId || '__none__'}
                onValueChange={v => setSchemeId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— All Schemes —</SelectItem>
                  {(schemes || []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.scheme_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product <span className="text-destructive">*</span></Label>
              <Select
                value={productId || '__none__'}
                onValueChange={v => {
                  setProductId(v === '__none__' ? '' : v);
                  setVersionId('');
                  clearError('productId');
                }}
              >
                <SelectTrigger className={errors.productId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Select —</SelectItem>
                  {(products || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.benefit_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && <p className="text-xs text-destructive mt-1">{errors.productId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Version</Label>
              <Select
                value={versionId || '__none__'}
                onValueChange={v => setVersionId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Latest Active —</SelectItem>
                  {(versions || []).map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version_number} ({v.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave blank to use the latest active version at execution time
              </p>
            </div>
          </div>

          {/* Isolation notice */}
          <div className="rounded-md bg-muted/50 border border-border p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Product and version selections reference existing configurations by ID only.
              No production data will be modified or duplicated.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Scenario Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenario Classification</CardTitle>
          <CardDescription>Define the type and data source for this scenario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scenario Type</Label>
              <Select
                value={scenarioType}
                onValueChange={v => setScenarioType(v as BnSimScenarioType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIO_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {SCENARIO_TYPES.find(t => t.value === scenarioType)?.desc}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select
                value={sourceType}
                onValueChange={v => setSourceType(v as BnSimSourceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {SOURCE_TYPES.find(t => t.value === sourceType)?.desc}
              </p>
            </div>
          </div>

          {/* Conditional: base claim ref for REPLAY */}
          {sourceType === 'REPLAY' && (
            <div className="space-y-2">
              <Label>Base Claim Reference <span className="text-destructive">*</span></Label>
              <Input
                value={baseClaimRef}
                onChange={e => { setBaseClaimRef(e.target.value); clearError('baseClaimRef'); }}
                placeholder="e.g. BN-2026-000042"
                maxLength={30}
                className={errors.baseClaimRef ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.baseClaimRef && <p className="text-xs text-destructive mt-1">{errors.baseClaimRef}</p>}
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  This reference is used to <strong>read</strong> existing claim data for replay only.
                  The production claim will not be modified. A snapshot of its data will be captured at run time.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: Input Payload & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Data & Notes</CardTitle>
          <CardDescription>Optional pre-populated input data and scenario notes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Input Payload (JSON)</Label>
            <Textarea
              value={inputPayload}
              onChange={e => { setInputPayload(e.target.value); clearError('inputPayload'); }}
              placeholder={`{\n  "ssn": "123456",\n  "claim_date": "2026-01-15",\n  "total_weeks": 150\n}`}
              rows={6}
              className={`font-mono text-sm ${errors.inputPayload ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            />
            {errors.inputPayload && <p className="text-xs text-destructive mt-1">{errors.inputPayload}</p>}
            <p className="text-xs text-muted-foreground">
              Pre-populate synthetic input parameters. These will be used when the simulation run starts.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional observations, expected outcomes, or caveats..."
              rows={3}
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={() => navigate('/bn/simulation')}>Cancel</Button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Saves to simulation tables only
          </Badge>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditMode ? 'Update Scenario' : 'Create Scenario'}
          </Button>
        </div>
      </div>
    </div>
  );
}
