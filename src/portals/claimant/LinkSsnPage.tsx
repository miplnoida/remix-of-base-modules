/**
 * LinkSsnPage — self-service "I am the insured person" verification.
 *
 * Per PR-B answer #1 ("yes seed", strict SSN-only match):
 *   user enters their SSN → we look it up in ip_master → on match we
 *   insert a VERIFIED SELF row into external_user_person_link.
 *
 * Prototype-level verification (no document upload yet) — production
 * should wire this through an OTP / KYC check.
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { seedSelfLinkIfMissing } from '@/services/external/seedSelfLink';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';
import { useNavigate } from 'react-router-dom';

export default function LinkSsnPage() {
  const { userId, persona, refetch } = useClaimantPersona();
  const [ssn, setSsn] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const alreadyLinked = !!persona?.personSsn;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { toast.error('You must be signed in.'); return; }
    if (!ssn.trim()) { toast.error('Enter your SSN.'); return; }
    setBusy(true);
    try {
      const ok = await seedSelfLinkIfMissing(userId, ssn.trim());
      if (!ok) {
        toast.error('No matching insured person found for that SSN.');
        return;
      }
      toast.success('SSN linked. Your insured-person sections are now available.');
      await refetch();
      navigate('/claimant/dashboard');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Link your SSN</CardTitle>
        <CardDescription>
          {alreadyLinked
            ? `You are already linked to SSN ${persona?.personSsn}.`
            : 'Connect this login to your Insured Person record so contribution and employment history become visible.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alreadyLinked ? (
          <Button onClick={() => navigate('/claimant/dashboard')}>Back to dashboard</Button>
        ) : (
          <form noValidate className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="ssn">SSN</Label>
              <Input
                id="ssn" value={ssn}
                onChange={(e) => setSsn(e.target.value)}
                placeholder="Your 6-digit SSN" inputMode="numeric" autoFocus
              />
            </div>
            <Button type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Link my SSN'}</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
