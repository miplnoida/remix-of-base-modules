/**
 * TemplatePreview — live preview of a BN template with the new
 * {{group.field}} tokens resolved against a chosen sample context.
 *
 * Sample context = active Country Pack (`bn_country`) + a sample legal
 * reference (`bn_legal_reference`) chosen by the user, merged with built-in
 * sample values for product/rule/decision/claim/person/payment.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  buildCountryContext,
  buildLegalContext,
  resolveTokens,
  sampleContext,
  type TokenContext,
} from '@/lib/bn/templateTokens';
import { useBnCountry } from '@/contexts/BnCountryContext';
import LegalReferenceSelector from '@/components/bn/selectors/LegalReferenceSelector';
import CountryFieldSelector from '@/components/bn/selectors/CountryFieldSelector';

const db = supabase as any;

/** Safe wrapper — returns null if no BnCountryProvider is mounted on this route. */
function useOptionalBnCountry(): { activeCountryCode: string | null } {
  try {
    const ctx = useBnCountry();
    return { activeCountryCode: ctx.activeCountryCode || null };
  } catch {
    return { activeCountryCode: null };
  }
}

interface Props {
  subject?: string | null;
  body?: string | null;
  htmlBody?: string | null;
}

const TemplatePreviewInner: React.FC<Props> = ({ subject, body, htmlBody }) => {
  const { activeCountryCode } = useOptionalBnCountry();
  const [countryCode, setCountryCode] = useState<string | null>(activeCountryCode || 'KN');
  const [legalRefId, setLegalRefId] = useState<string | null>(null);

  const { data: countryRow } = useQuery({
    queryKey: ['bn-country-row', countryCode],
    enabled: !!countryCode,
    queryFn: async () => {
      const { data } = await db.from('bn_country').select('*').eq('country_code', countryCode).maybeSingle();
      return data;
    },
  });

  const { data: legalRow } = useQuery({
    queryKey: ['bn-legal-ref-row', legalRefId],
    enabled: !!legalRefId,
    queryFn: async () => {
      const { data } = await db.from('bn_legal_reference').select('*').eq('id', legalRefId).maybeSingle();
      return data;
    },
  });

  const ctx: TokenContext = useMemo(() => {
    const base = sampleContext();
    if (countryRow) base.country = buildCountryContext(countryRow);
    if (legalRow) {
      base.legal = buildLegalContext(legalRow);
      // also surface to product/rule/decision legal_reference shortcuts
      const shortRef = legalRow.short_title ?? '';
      base.product = { ...(base.product ?? {}), legal_reference: shortRef };
      base.rule = { ...(base.rule ?? {}), legal_reference: shortRef };
      base.decision = { ...(base.decision ?? {}), legal_reference: shortRef };
    }
    return base;
  }, [countryRow, legalRow]);

  const subjectRes = useMemo(() => resolveTokens(subject ?? '', ctx), [subject, ctx]);
  const bodyRes = useMemo(() => resolveTokens(htmlBody || body || '', ctx), [body, htmlBody, ctx]);

  const allMissing = [...new Set([...subjectRes.missing, ...bodyRes.missing])];
  const allUnknown = [...new Set([...subjectRes.unknown, ...bodyRes.unknown])];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Country context</label>
          <CountryFieldSelector value={countryCode} onChange={(c) => { setCountryCode(c); setLegalRefId(null); }} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Legal reference context</label>
          <LegalReferenceSelector value={legalRefId} onChange={(id) => setLegalRefId(id)} countryCode={countryCode} />
        </div>
      </div>

      {(allMissing.length > 0 || allUnknown.length > 0) ? (
        <Card>
          <CardContent className="py-3 space-y-2 text-xs">
            {allUnknown.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5" />
                <div>
                  <span className="font-medium text-destructive">Unknown tokens:</span>{' '}
                  {allUnknown.map(k => <Badge key={k} variant="destructive" className="mr-1 text-[10px]">{`{{${k}}}`}</Badge>)}
                </div>
              </div>
            )}
            {allMissing.length > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-medium text-amber-700">Unresolved with current context:</span>{' '}
                  {allMissing.map(k => <Badge key={k} variant="outline" className="mr-1 text-[10px] border-amber-300">{`{{${k}}}`}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> All tokens resolved against current context.
        </div>
      )}

      {subject && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Subject</p>
          <p className="text-sm font-medium border rounded px-3 py-2 bg-muted/30">{subjectRes.output}</p>
        </div>
      )}
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Body</p>
        {htmlBody
          ? <div className="border rounded p-3 prose prose-sm max-w-none bg-background" dangerouslySetInnerHTML={{ __html: bodyRes.output }} />
          : <pre className="border rounded p-3 text-sm whitespace-pre-wrap bg-background">{bodyRes.output}</pre>}
      </div>
    </div>
  );
};

export default TemplatePreview;
