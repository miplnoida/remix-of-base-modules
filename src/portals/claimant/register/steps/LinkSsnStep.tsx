import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { attemptSsnLink, type LinkAttemptResult } from '@/services/external/identityLinkingService';

interface Props {
  userId: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  onDone: (result: LinkAttemptResult) => void;
}

export function LinkSsnStep({ userId, emailVerified, phoneVerified, onDone }: Props) {
  const [ssn, setSsn] = useState('');
  const [dob, setDob] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [previousName, setPreviousName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!ssn.trim()) e.ssn = 'SSN is required.';
    if (!dob) e.dob = 'Date of birth is required.';
    if (!firstName.trim()) e.firstName = 'First name is required.';
    if (!lastName.trim()) e.lastName = 'Last name is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!userId) { toast.error('You must be signed in.'); return; }
    if (!validate()) { toast.error('Please check the form for valid information!'); return; }
    setBusy(true);
    try {
      const result = await attemptSsnLink(userId, {
        ssn: ssn.trim(),
        dateOfBirth: dob,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || undefined,
        previousName: previousName.trim() || undefined,
        nationalId: nationalId.trim() || undefined,
      }, { verifiedEmail: emailVerified, verifiedPhone: phoneVerified });
      onDone(result);
    } finally { setBusy(false); }
  }

  return (
    <form noValidate className="space-y-3" onSubmit={submit}>
      <p className="text-sm text-muted-foreground">
        Enter the details exactly as they appear on your Social Security record. We will not show
        which details didn't match for your security.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ssn">SSN</Label>
          <Input id="ssn" value={ssn} onChange={e => setSsn(e.target.value)} inputMode="numeric" autoFocus
            className={errors.ssn ? 'border-destructive focus-visible:ring-destructive' : ''} />
          {errors.ssn && <p className="text-xs text-destructive mt-1">{errors.ssn}</p>}
        </div>
        <div>
          <Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" type="date" value={dob} onChange={e => setDob(e.target.value)}
            className={errors.dob ? 'border-destructive focus-visible:ring-destructive' : ''} />
          {errors.dob && <p className="text-xs text-destructive mt-1">{errors.dob}</p>}
        </div>
        <div>
          <Label htmlFor="first">First name</Label>
          <Input id="first" value={firstName} onChange={e => setFirstName(e.target.value)}
            className={errors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''} />
          {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <Label htmlFor="last">Last name</Label>
          <Input id="last" value={lastName} onChange={e => setLastName(e.target.value)}
            className={errors.lastName ? 'border-destructive focus-visible:ring-destructive' : ''} />
          {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
        </div>
        <div>
          <Label htmlFor="middle">Middle name (optional)</Label>
          <Input id="middle" value={middleName} onChange={e => setMiddleName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="previous">Previous / maiden name (optional)</Label>
          <Input id="previous" value={previousName} onChange={e => setPreviousName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="nid">National ID / passport (optional)</Label>
          <Input id="nid" value={nationalId} onChange={e => setNationalId(e.target.value)} />
        </div>
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Verifying…' : 'Link my Social Security record'}
      </Button>
    </form>
  );
}
