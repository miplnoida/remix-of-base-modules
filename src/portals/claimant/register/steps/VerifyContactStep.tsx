import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CheckCircle2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  sendEmailOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp,
} from '@/services/external/identityLinkingService';

interface Props {
  email: string;
  phone: string;
  onDone: (flags: { emailVerified: boolean; phoneVerified: boolean }) => void;
}

export function VerifyContactStep({ email, phone, onDone }: Props) {
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [busy, setBusy] = useState<'' | 'email-send' | 'email-verify' | 'phone-send' | 'phone-verify'>('');

  const canContinue = emailVerified || phoneVerified;

  async function sendEmail() {
    setBusy('email-send');
    try { await sendEmailOtp(email); toast.success(`Code sent to ${email}`); }
    catch (e: any) {
      console.error('[OTP] sendEmail failed', e);
      toast.error(e?.message || 'Could not send code. Try again.');
    }
    finally { setBusy(''); }
  }
  async function checkEmail() {
    setBusy('email-verify');
    try {
      const ok = await verifyEmailOtp(email, emailCode.trim());
      if (ok) { setEmailVerified(true); toast.success('Email verified'); }
      else toast.error('Code is incorrect or expired.');
    } finally { setBusy(''); }
  }
  async function sendPhone() {
    setBusy('phone-send');
    try { await sendPhoneOtp(phone); toast.success(`Code sent to ${phone}`); }
    catch (e: any) {
      console.error('[OTP] sendPhone failed', e);
      toast.error(e?.message || 'Could not send code. Try again.');
    }
    finally { setBusy(''); }
  }

  async function checkPhone() {
    setBusy('phone-verify');
    try {
      const ok = await verifyPhoneOtp(phone, phoneCode.trim());
      if (ok) { setPhoneVerified(true); toast.success('Phone verified'); }
      else toast.error('Code is incorrect or expired.');
    } finally { setBusy(''); }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Verify your email or phone to continue. You only need one.
      </p>
      <Tabs defaultValue="email">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">
            <Mail className="mr-2 h-3.5 w-3.5" /> Email
            {emailVerified && <CheckCircle2 className="ml-1 h-3.5 w-3.5 text-emerald-600" />}
          </TabsTrigger>
          <TabsTrigger value="phone">
            <Phone className="mr-2 h-3.5 w-3.5" /> Phone
            {phoneVerified && <CheckCircle2 className="ml-1 h-3.5 w-3.5 text-emerald-600" />}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="space-y-3 pt-4">
          <div className="text-sm">Code will be sent to <strong>{email}</strong></div>
          <Button type="button" variant="outline" size="sm" onClick={sendEmail} disabled={busy === 'email-send' || emailVerified}>
            {busy === 'email-send' ? 'Sending…' : emailVerified ? 'Verified' : 'Send code'}
          </Button>
          <div>
            <Label htmlFor="email-otp">Verification code</Label>
            <Input id="email-otp" value={emailCode} onChange={e => setEmailCode(e.target.value)}
              disabled={emailVerified} inputMode="numeric" />
          </div>
          <Button type="button" onClick={checkEmail} disabled={!emailCode || busy === 'email-verify' || emailVerified}>
            {busy === 'email-verify' ? 'Verifying…' : 'Verify email'}
          </Button>
        </TabsContent>
        <TabsContent value="phone" className="space-y-3 pt-4">
          <div className="text-sm">Code will be sent to <strong>{phone}</strong></div>
          <Button type="button" variant="outline" size="sm" onClick={sendPhone} disabled={busy === 'phone-send' || phoneVerified}>
            {busy === 'phone-send' ? 'Sending…' : phoneVerified ? 'Verified' : 'Send code'}
          </Button>
          <div>
            <Label htmlFor="phone-otp">Verification code</Label>
            <Input id="phone-otp" value={phoneCode} onChange={e => setPhoneCode(e.target.value)}
              disabled={phoneVerified} inputMode="numeric" />
          </div>
          <Button type="button" onClick={checkPhone} disabled={!phoneCode || busy === 'phone-verify' || phoneVerified}>
            {busy === 'phone-verify' ? 'Verifying…' : 'Verify phone'}
          </Button>
        </TabsContent>
      </Tabs>
      <Button className="w-full" disabled={!canContinue}
        onClick={() => onDone({ emailVerified, phoneVerified })}>
        Continue
      </Button>
    </div>
  );
}
