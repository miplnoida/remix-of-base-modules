import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { externalApiClient } from '@/services/external/externalApiClient';
import { startRegistration } from '@/services/external/identityLinkingService';

interface Props {
  onDone: (info: { email: string; phone: string }) => void;
}

export function CreateAccountStep({ onDone }: Props) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (!phone.trim()) e.phone = 'Enter your mobile number.';
    if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!terms) e.terms = 'You must accept the terms to continue.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please check the form for valid information!');
      return;
    }
    setBusy(true);
    try {
      await externalApiClient.registerExternalUser({
        accountType: 'claimant',
        email,
        phone,
        password,
        displayName: email.split('@')[0],
      });
      await startRegistration({ email, phone });
      onDone({ email, phone });
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate className="space-y-4" onSubmit={submit}>
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
          className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''} />
        {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
      </div>
      <div>
        <Label htmlFor="phone">Mobile number</Label>
        <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          className={errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''} />
        {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
          className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''} />
        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
      </div>
      <div className="flex items-start gap-2 pt-1">
        <Checkbox id="terms" checked={terms} onCheckedChange={(c) => setTerms(!!c)} />
        <Label htmlFor="terms" className="text-sm font-normal">
          I agree to the Terms of Service and Privacy Policy.
        </Label>
      </div>
      {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
