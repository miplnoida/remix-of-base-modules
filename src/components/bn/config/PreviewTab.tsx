import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useBnProduct, useBnProductVersion, useBnEligibilityRules, useBnCalculationRules, useBnTimelineRules } from '@/hooks/bn/useBnProduct';
import { useBnDocumentRules } from '@/hooks/bn/useBnConfig';
import { useApplicationFormDefinition } from '@/hooks/bn/useApplicationFormDefinition';
import { ApplicationFormEngine } from '@/components/bn/forms/ApplicationFormEngine';
import type { FormChannel } from '@/services/bn/forms/sectionCatalogue';
import { BN_CATEGORY_LABELS, BN_PRODUCT_STATUS_LABELS, BN_RULE_TYPES, BN_CALC_TYPES, BN_TIMELINE_TYPES } from '@/types/bn';
import { CheckCircle, FileText, Calculator, Clock, Shield, Eye } from 'lucide-react';

interface Props { productId: string | undefined; versionId: string | undefined; }

export function PreviewTab({ productId, versionId }: Props) {
  const { data: product } = useBnProduct(productId);
  const { data: version } = useBnProductVersion(versionId);
  const { data: eligRules = [] } = useBnEligibilityRules(versionId);
  const { data: calcRules = [] } = useBnCalculationRules(versionId);
  const { data: timeRules = [] } = useBnTimelineRules(versionId);
  const { data: docRules = [] } = useBnDocumentRules(productId);

  // Four application channels in the UI, mapped to the underlying FormChannel triple.
  type PreviewChannel = 'PUBLIC_ONLINE' | 'STAFF_OFFLINE' | 'ASSISTED_COUNTER' | 'BACK_OFFICE_ENTRY';
  const CHANNEL_MAP: Record<PreviewChannel, FormChannel> = {
    PUBLIC_ONLINE: 'PUBLIC',
    STAFF_OFFLINE: 'INTERNAL',
    ASSISTED_COUNTER: 'ASSISTED_OFFLINE',
    BACK_OFFICE_ENTRY: 'INTERNAL',
  };
  const [previewChannel, setPreviewChannel] = useState<PreviewChannel>('STAFF_OFFLINE');
  const channel: FormChannel = CHANNEL_MAP[previewChannel];
  const today = new Date().toISOString().slice(0, 10);
  const { data: formDef, isLoading: formLoading, error: formError } = useApplicationFormDefinition(
    product?.benefit_code,
    today,
    channel,
  );

  if (!productId || !product) return <Card><CardContent className="py-8 text-center text-muted-foreground">Save the product first to preview configuration.</CardContent></Card>;

  return (
    <div className="space-y-4">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Configuration Summary</CardTitle>
          <CardDescription>Read-only preview of the complete product configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Identity */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Product Identity</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="text-muted-foreground">Code:</span> <span className="font-mono">{product.benefit_code}</span></div>
              <div><span className="text-muted-foreground">Name:</span> {product.benefit_name}</div>
              <div><span className="text-muted-foreground">Category:</span> <Badge variant="outline">{BN_CATEGORY_LABELS[product.category] || product.category}</Badge></div>
              <div><span className="text-muted-foreground">Payment:</span> {product.payment_type}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge>{BN_PRODUCT_STATUS_LABELS[product.status] || product.status}</Badge></div>
              <div><span className="text-muted-foreground">Country:</span> {product.country_code}</div>
            </div>
          </div>

          <Separator />

          {version && (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-2">Active Version (V{version.version_number})</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Effective:</span> {version.effective_from} — {version.effective_to || 'Open'}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{version.status}</Badge></div>
                  <div><span className="text-muted-foreground">Employer Verification:</span> {version.requires_employer_verification ? '✓ Required' : '—'}</div>
                  <div><span className="text-muted-foreground">Medical Board:</span> {version.requires_medical_board_review ? '✓ Required' : '—'}</div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Eligibility */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Eligibility Rules ({eligRules.length})</h3>
            {eligRules.length === 0 ? <p className="text-sm text-muted-foreground">None configured</p> : (
              <div className="space-y-1">
                {eligRules.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="text-xs">{r.rule_code}</Badge>
                    <span>{r.rule_name}</span>
                    <span className="text-muted-foreground">({BN_RULE_TYPES.find(t => t.value === r.rule_type)?.label})</span>
                    {r.fail_action !== 'REJECT' && <Badge variant="outline" className="text-xs">{r.fail_action}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Calculation */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Calculator className="h-4 w-4 text-blue-500" /> Calculation Rules ({calcRules.length})</h3>
            {calcRules.length === 0 ? <p className="text-sm text-muted-foreground">None configured</p> : (
              <div className="space-y-1">
                {calcRules.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="text-xs">{r.rule_code}</Badge>
                    <span>{r.rule_name}</span>
                    <span className="text-muted-foreground">({BN_CALC_TYPES.find(t => t.value === r.calc_type)?.label})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Timelines */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> Timeline Rules ({timeRules.length})</h3>
            {timeRules.length === 0 ? <p className="text-sm text-muted-foreground">None configured</p> : (
              <div className="space-y-1">
                {timeRules.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="text-xs">{r.rule_code}</Badge>
                    <span>{r.rule_name}</span>
                    <span className="text-muted-foreground">({BN_TIMELINE_TYPES.find(t => t.value === r.timeline_type)?.label})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Documents */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-purple-500" /> Document Rules ({docRules.length})</h3>
            {docRules.length === 0 ? <p className="text-sm text-muted-foreground">None configured</p> : (
              <div className="space-y-1">
                {docRules.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <Badge variant={r.is_mandatory ? 'destructive' : 'secondary'} className="text-xs">{r.is_mandatory ? 'Required' : 'Optional'}</Badge>
                    <span>{r.document_name}</span>
                    <span className="text-muted-foreground">({r.stage})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Application Form Preview</CardTitle>
          <CardDescription>Renders the live form engine for this product version. Switch channel to see how Internal, Assisted Offline, and Public applicants experience the form.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={channel} onValueChange={(v) => setChannel(v as FormChannel)}>
            <TabsList>
              <TabsTrigger value="INTERNAL">Internal</TabsTrigger>
              <TabsTrigger value="ASSISTED_OFFLINE">Assisted Offline</TabsTrigger>
              <TabsTrigger value="PUBLIC">Public Online</TabsTrigger>
            </TabsList>
            <TabsContent value={channel} className="pt-4">
              {formLoading && <Skeleton className="h-64 w-full" />}
              {formError && (
                <Alert variant="destructive">
                  <AlertTitle>Unable to load form</AlertTitle>
                  <AlertDescription>{(formError as Error).message}</AlertDescription>
                </Alert>
              )}
              {formDef && (
                <ApplicationFormEngine
                  definition={formDef}
                  channel={channel}
                  readOnly
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
