import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useProductApplicability } from '@/hooks/external/useProductApplicability';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { auditPortalAction } from '@/services/external/auditPortalAction';
import { useExternalContributions } from '@/portals/_shared/externalHooks';

interface EstResult {
  productCode: string;
  productName: string;
  eligible: boolean;
  reasons: string[];
}

export default function EligibilityEstimatorPage() {
  const { persona, userId } = useClaimantPersona();
  const { data: products } = useProductApplicability();
  const { data: contribData } = useExternalContributions();

  const [productCode, setProductCode] = useState<string>('');
  const [weeks, setWeeks] = useState<string>(
    String((contribData?.contributions ?? []).reduce((s: number, r: any) => s + Number(r.weeks_paid ?? 0), 0)),
  );
  const [age, setAge] = useState<string>('');
  const [result, setResult] = useState<EstResult | null>(null);

  function run() {
    const product = (products ?? []).find(p => p.benefit_code === productCode);
    if (!product) return;
    const reasons: string[] = [];
    const w = Number(weeks || 0);
    const a = Number(age || 0);

    // Generic illustrative rules — never authoritative, never creates a claim.
    if (w < 26) reasons.push(`Only ${w} contribution weeks on record (typical minimum: 26).`);
    if (/PENSION|RETIRE/i.test(product.benefit_name) && a > 0 && a < 62) {
      reasons.push(`Below typical pension age 62 (entered age: ${a}).`);
    }
    if (!persona?.personSsn) reasons.push('Your SSN is not linked. Estimates may not reflect your record.');

    const out: EstResult = {
      productCode: product.benefit_code,
      productName: product.benefit_name,
      eligible: reasons.length === 0,
      reasons,
    };
    setResult(out);
    auditPortalAction('ESTIMATOR_RUN', { userId, payload: { productCode: out.productCode, eligible: out.eligible } });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Eligibility Estimator</CardTitle>
          <CardDescription>
            A read-only check against the Product Catalog. Nothing is filed and no claim is created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Benefit</Label>
              <Select value={productCode} onValueChange={setProductCode}>
                <SelectTrigger><SelectValue placeholder="Choose a benefit" /></SelectTrigger>
                <SelectContent>
                  {(products ?? []).map(p => (
                    <SelectItem key={p.id} value={p.benefit_code}>{p.benefit_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contribution weeks</Label>
              <Input type="number" value={weeks} onChange={e => setWeeks(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Age (years)</Label>
              <Input type="number" value={age} onChange={e => setAge(e.target.value)} />
            </div>
          </div>
          <Button onClick={run} disabled={!productCode}>Run estimate</Button>
        </CardContent>
      </Card>

      {result && (
        <Alert variant={result.eligible ? 'default' : 'destructive'}>
          <AlertTitle className="flex items-center gap-2">
            {result.productName}{' '}
            <Badge variant={result.eligible ? 'default' : 'destructive'}>
              {result.eligible ? 'Likely eligible' : 'Likely not eligible'}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            {result.reasons.length === 0 ? (
              'No blocking issues found in the dry-run. Confirm with an officer before filing.'
            ) : (
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
