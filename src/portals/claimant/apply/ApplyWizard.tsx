/**
 * ApplyWizard — public-channel "Apply for Benefits" entry flow.
 *
 * Step 1: "Who are you applying for?" (intent tile picker)
 * Step 2: Catalog of eligible benefits, fully driven by
 *         publicProductCatalogService.getPublicAvailableProducts(ctx).
 *
 * Step 3 (the actual form) is hosted at /claimant/apply/:benefitCode and
 * rendered by the existing PortalFormRenderer, which we leave untouched.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  HeartPulse, Baby, Hammer, Sun, Accessibility, Users, Flower2, HandHeart,
  ShieldCheck, GraduationCap, Banknote, ArrowLeft, ArrowRight, HelpCircle, FileText,
  User as UserIcon, Flower, UserCheck, Sparkles, Clock, Info,
} from 'lucide-react';
import {
  getPublicAvailableProducts,
  isPeopleIManageEnabled,
  type ApplyIntent,
  type ApplicationContext,
  type PublicProductSummary,
} from '@/services/external/publicProductCatalogService';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';

// Icon map keyed by benefit_code. Falls back to FileText.
const BENEFIT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  SB: HeartPulse, SICKNESS: HeartPulse,
  MB: Baby, MATERNITY: Baby,
  EI: Hammer, EMPLOYMENT_INJURY: Hammer,
  AB: Sun, AGE: Sun, AGE_PENSION: Sun,
  IB: Accessibility, INVALIDITY: Accessibility,
  SV: Users, SURVIVOR: Users, SURVIVORS: Users,
  FG: Flower2, FUNERAL: Flower2,
  NCP: HandHeart, NON_CONTRIB: HandHeart,
  LC: ShieldCheck, LIFE_CERT: ShieldCheck,
  SC: GraduationCap, SCHOOL_CERT: GraduationCap,
  EFT: Banknote, BANK_UPDATE: Banknote,
};

const INTENT_TILES: Array<{
  key: ApplyIntent;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  managedFlag?: boolean;
}> = [
  { key: 'self', label: 'Myself', description: 'I want to apply for a benefit for myself.', icon: UserIcon },
  { key: 'deceased', label: 'Someone deceased', description: 'I am claiming for a relative who has passed away.', icon: Flower },
  { key: 'child', label: 'A child or dependant', description: 'I am applying for a child, student, or dependant.', icon: GraduationCap },
  { key: 'managed', label: 'Someone I manage', description: 'I am a guardian, payee, or representative.', icon: UserCheck, managedFlag: true },
  { key: 'funeral', label: 'Funeral expenses', description: 'I paid for or arranged the funeral.', icon: Flower2 },
  { key: 'not_sure', label: 'I\'m not sure', description: 'Show me everything I might be able to apply for.', icon: HelpCircle },
];

export default function ApplyWizard() {
  const navigate = useNavigate();
  const { persona, isLoading: personaLoading, userId } = useClaimantPersona();
  const [intent, setIntent] = useState<ApplyIntent | null>(null);

  const { data: managedEnabled = false } = useQuery({
    queryKey: ['feature', 'people_i_manage_enabled'],
    queryFn: isPeopleIManageEnabled,
    staleTime: 5 * 60_000,
  });

  // Auto-skip step 1 if there's exactly one obvious intent (rare; keep simple).
  useEffect(() => {
    if (!personaLoading && persona && intent === null) {
      // If the user is a pensioner only, default to "self".
      const p = persona.personas ?? [];
      if (p.length === 1 && p[0] === 'PENSIONER') setIntent('self');
    }
  }, [persona, personaLoading, intent]);

  if (intent === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Apply for Benefits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us who you are applying for. We will only show benefits you can apply for online.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTENT_TILES.filter((t) => !t.managedFlag || managedEnabled).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setIntent(t.key)}
              className="text-left rounded-lg border-2 bg-card p-5 hover:border-primary hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <t.icon className="h-7 w-7 text-primary mb-3" />
              <div className="font-semibold mb-1">{t.label}</div>
              <p className="text-sm text-muted-foreground">{t.description}</p>
            </button>
          ))}
        </div>
        <div>
          <Button variant="ghost" onClick={() => navigate('/claimant/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CatalogStep
      intent={intent}
      onBack={() => setIntent(null)}
      onPick={(p) => navigate(`/claimant/apply/${encodeURIComponent(p.benefitCode)}`)}
      ctx={{
        intent,
        applicantUserId: userId ?? null,
        applicantPersonas: (persona?.personas ?? []) as ApplicationContext['applicantPersonas'],
        subjectIsSelfVerified: !!persona?.flags?.canApplyForSelf,
        peopleIManageEnabled: managedEnabled,
      }}
    />
  );
}

function CatalogStep({
  intent,
  ctx,
  onBack,
  onPick,
}: {
  intent: ApplyIntent;
  ctx: ApplicationContext;
  onBack: () => void;
  onPick: (p: PublicProductSummary) => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['publicCatalog', intent, ctx.subjectIsSelfVerified, ctx.peopleIManageEnabled],
    queryFn: () => getPublicAvailableProducts(ctx),
    staleTime: 60_000,
  });

  const intentLabel = useMemo(() => INTENT_TILES.find((t) => t.key === intent)?.label ?? '', [intent]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Choose a benefit</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Showing benefits for: <span className="font-medium text-foreground">{intentLabel}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Change
        </Button>
      </div>

      {ctx.subjectIsSelfVerified === false && intent === 'self' && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 px-4 text-sm flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-amber-700" />
            <div>
              We could not verify your Social Security record yet. You can still apply for benefits, but
              eligibility prechecks and contribution history will be unavailable until your record is linked.
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {(error as Error).message ?? 'Could not load benefit catalog.'}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (data?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground space-y-2">
            <Sparkles className="h-6 w-6 mx-auto text-muted-foreground" />
            <div>No benefits are currently available online for this selection.</div>
            <div>Please contact the Social Security office for assistance.</div>
          </CardContent>
        </Card>
      )}

      {(data?.length ?? 0) > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data!.map((p) => {
            const Icon = BENEFIT_ICON[p.benefitCode?.toUpperCase()] ?? FileText;
            const disabled = !!p.disabledReason;
            return (
              <Card key={p.channelConfigId} className={`flex flex-col ${disabled ? 'opacity-70' : 'hover:shadow-md hover:border-primary transition-all'}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <Icon className="h-7 w-7 text-primary" />
                    {p.category && <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>}
                  </div>
                  <CardTitle className="text-base mt-2">{p.benefitName}</CardTitle>
                  {p.shortDescription && (
                    <CardDescription className="line-clamp-2">{p.shortDescription}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-2 text-xs text-muted-foreground">
                  {p.whoCanApply && (
                    <div><span className="font-medium text-foreground">Who can apply:</span> {p.whoCanApply}</div>
                  )}
                  {p.estimatedProcessingDays != null && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Usually decided in ~{p.estimatedProcessingDays} days
                    </div>
                  )}
                  {disabled ? (
                    <div className="mt-auto pt-3">
                      <Badge variant="outline" className="text-amber-700 border-amber-400">
                        {p.disabledReason}
                      </Badge>
                    </div>
                  ) : (
                    <div className="mt-auto pt-3">
                      <Button size="sm" className="w-full" onClick={() => onPick(p)}>
                        Start application <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
