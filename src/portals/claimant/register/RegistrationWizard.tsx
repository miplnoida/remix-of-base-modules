/**
 * RegistrationWizard — 4-step public registration + SSN linking.
 *
 * Re-entry: an authenticated user can land here with ?step=link to perform
 * only the SSN-linking step (e.g. from the dashboard banner).
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { CreateAccountStep } from './steps/CreateAccountStep';
import { VerifyContactStep } from './steps/VerifyContactStep';
import { LinkSsnStep } from './steps/LinkSsnStep';
import { ResultStep } from './steps/ResultStep';
import type { LinkAttemptResult } from '@/services/external/identityLinkingService';

type Step = 'create' | 'verify' | 'link' | 'result';
const ORDER: Step[] = ['create', 'verify', 'link', 'result'];
const LABEL: Record<Step, string> = {
  create: 'Create account',
  verify: 'Verify contact',
  link: 'Link record',
  result: 'Done',
};

export default function RegistrationWizard() {
  const { isAuthenticated, userId, email: authEmail } = useClaimantPersona();
  const [params] = useSearchParams();
  const requested = params.get('step') as Step | null;

  // Authenticated re-entry skips the first two steps.
  const initial: Step = isAuthenticated && requested === 'link' ? 'link' : 'create';

  const [step, setStep] = useState<Step>(initial);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [result, setResult] = useState<LinkAttemptResult | null>(null);

  // If user is already logged in and lands without ?step, jump them to the link step.
  useEffect(() => {
    if (isAuthenticated && step === 'create') {
      setEmail(authEmail ?? '');
      setEmailVerified(true);
      setStep('link');
    }
  }, [isAuthenticated, authEmail, step]);

  const stepIndex = ORDER.indexOf(step);
  const progress = ((stepIndex + 1) / ORDER.length) * 100;

  const body = useMemo(() => {
    switch (step) {
      case 'create':
        return <CreateAccountStep onDone={(d) => { setEmail(d.email); setPhone(d.phone); setStep('verify'); }} />;
      case 'verify':
        return (
          <VerifyContactStep
            email={email}
            phone={phone}
            onDone={(f) => { setEmailVerified(f.emailVerified); setPhoneVerified(f.phoneVerified); setStep('link'); }}
          />
        );
      case 'link':
        return (
          <LinkSsnStep
            userId={userId}
            emailVerified={emailVerified || !!isAuthenticated}
            phoneVerified={phoneVerified}
            onDone={(r) => { setResult(r); setStep('result'); }}
          />
        );
      case 'result':
        return result ? <ResultStep result={result} userId={userId} /> : null;
    }
  }, [step, email, phone, userId, emailVerified, phoneVerified, result, isAuthenticated]);

  return (
    <div className="mx-auto max-w-2xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Get started with Social Security Self-Service</CardTitle>
          <CardDescription>
            Create your account and link your Social Security record to manage benefits, claims, and contributions.
          </CardDescription>
          <div className="pt-3 space-y-2">
            <Progress value={progress} className="h-1.5" />
            <ol className="flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
              {ORDER.map((s, i) => (
                <li key={s} className={`flex items-center gap-1 ${i <= stepIndex ? 'text-primary font-medium' : ''}`}>
                  {i < stepIndex && <CheckCircle2 className="h-3 w-3" />}
                  {LABEL[s]}
                </li>
              ))}
            </ol>
          </div>
        </CardHeader>
        <CardContent>
          {body}
          {step !== 'result' && (
            <p className="mt-6 text-xs text-muted-foreground text-center">
              Already registered? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
