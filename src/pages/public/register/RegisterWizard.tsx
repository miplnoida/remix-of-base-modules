import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  externalApiClient,
  type AccountType,
} from "@/services/external/externalApiClient";
import {
  HeartPulse, Building2, Stethoscope, LinkIcon, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck,
} from "lucide-react";

const STEP_LABELS = [
  "Account type",
  "Email or phone",
  "Verify",
  "Profile",
  "Link record",
  "Done",
];

export default function RegisterWizard() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const initialType = (search.get("type") as AccountType | null) ?? null;

  const [step, setStep] = useState(initialType ? 1 : 0);
  const [accountType, setAccountType] = useState<AccountType | null>(initialType);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [verifiedBy, setVerifiedBy] = useState<"email" | "phone" | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Step 5 link state
  const [ssn, setSsn] = useState("");
  const [dob, setDob] = useState("");
  const [regno, setRegno] = useState("");
  const [employerRole, setEmployerRole] = useState("EMPLOYER_ADMIN");
  const [license, setLicense] = useState("");
  const [linkResult, setLinkResult] = useState<"matched" | "unmatched" | "pending" | null>(null);

  const progress = useMemo(() => ((step + 1) / STEP_LABELS.length) * 100, [step]);

  // If user is "task" type, send them straight to /external/tasks landing
  useEffect(() => {
    if (accountType === "task" && step === 1) {
      navigate("/external/tasks", { replace: true });
    }
  }, [accountType, step, navigate]);

  const next = () => setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  /* ----- step 1 → 2: create user + send OTP ----- */
  const submitContact = async () => {
    if (!email && !phone) return toast.error("Please provide an email or a mobile number.");
    if (password.length < 8) return toast.error("Please choose a password of at least 8 characters.");
    try {
      const res = await externalApiClient.registerExternalUser({
        accountType: accountType!,
        email: email || undefined,
        phone: phone || undefined,
        password,
        displayName: displayName || (email || phone),
      });
      setUserId(res.user?.id ?? null);
      toast.success("Check your inbox or phone for a verification code.");
      next();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start registration.");
    }
  };

  /* ----- step 2: verify OTP (either channel) ----- */
  const submitOtp = async () => {
    try {
      if (email) {
        await externalApiClient.verifyEmailOtp(email, otp);
        setVerifiedBy("email");
      } else if (phone) {
        await externalApiClient.verifyPhoneOtp(phone, otp);
        setVerifiedBy("phone");
      }
      toast.success("Verified.");
      next();
    } catch (e: any) {
      toast.error(e?.message ?? "Invalid or expired code.");
    }
  };

  /* ----- step 3: profile (display name already captured; just save lang) ----- */
  const submitProfile = async () => {
    try {
      await supabase.auth.updateUser({
        data: { display_name: displayName, [`${verifiedBy}_verified`]: true },
      });
      next();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save profile.");
    }
  };

  /* ----- step 4: link ----- */
  const submitLink = async () => {
    if (!userId) return toast.error("Session lost. Please sign in again.");
    try {
      if (accountType === "claimant") {
        const r = await externalApiClient.linkInsuredPerson(userId, { ssn, dateOfBirth: dob });
        setLinkResult(r.matched ? "matched" : "unmatched");
      } else if (accountType === "employer") {
        const r = await externalApiClient.registerEmployerUser(userId, regno, employerRole);
        setLinkResult(r.matched ? "pending" : "unmatched");
      } else if (accountType === "doctor") {
        await externalApiClient.registerMedicalProviderUser(userId, license);
        setLinkResult("pending");
      }
      next();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not complete linking.");
    }
  };

  const goDashboard = () => {
    if (accountType === "employer") navigate("/employer/dashboard");
    else if (accountType === "doctor") navigate("/doctor/dashboard");
    else navigate("/claimant/dashboard");
  };

  return (
    <div className="min-h-screen bg-muted/30 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <Link to="/public" className="text-sm text-muted-foreground hover:underline">← Back to home</Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2 mb-1">Create your online account</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
        </p>
        <Progress value={progress} className="mb-6" />

        <Card>
          <CardContent className="p-6">
            {/* Step 0 — account type */}
            {step === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-2">
                  How would you like to use online services?
                </p>
                {[
                  { v: "claimant", icon: HeartPulse, title: "I am an insured person or claimant" },
                  { v: "employer", icon: Building2, title: "I represent an employer" },
                  { v: "doctor", icon: Stethoscope, title: "I am a doctor or medical provider" },
                  { v: "task", icon: LinkIcon, title: "I received a secure task link" },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => { setAccountType(o.v as AccountType); next(); }}
                    className="w-full text-left border-2 rounded-lg p-4 flex items-center gap-3 hover:border-primary transition-colors"
                  >
                    <o.icon className="h-5 w-5 text-primary" />
                    <span className="font-medium">{o.title}</span>
                    <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {/* Step 1 — contact */}
            {step === 1 && accountType !== "task" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Give us an email <strong>or</strong> a mobile number. We'll send a code to verify it.
                </p>
                <div>
                  <Label htmlFor="dn">Your name</Label>
                  <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Maria Joseph" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="em">Email</Label>
                    <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="ph">Mobile number</Label>
                    <Input id="ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 869 555 0100" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pw">Password</Label>
                  <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                </div>
                <Footer onBack={back} onNext={submitContact} nextLabel="Send code" />
              </div>
            )}

            {/* Step 2 — verify */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code we sent to{" "}
                  <strong>{email || phone}</strong>.
                </p>
                <div>
                  <Label htmlFor="ot">Verification code</Label>
                  <Input id="ot" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
                </div>
                <Footer onBack={back} onNext={submitOtp} nextLabel="Verify" />
              </div>
            )}

            {/* Step 3 — profile */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Confirm how you'd like us to address you.</p>
                <div>
                  <Label htmlFor="dn2">Your name</Label>
                  <Input id="dn2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <Footer onBack={back} onNext={submitProfile} nextLabel="Continue" />
              </div>
            )}

            {/* Step 4 — link */}
            {step === 4 && accountType === "claimant" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Help us find your Social Security record. You can still apply even
                  if we can't link your SSN now.
                </p>
                <div>
                  <Label htmlFor="ssn">SSN</Label>
                  <Input id="ssn" value={ssn} onChange={(e) => setSsn(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <Footer onBack={back} onNext={submitLink} nextLabel="Link my record" />
              </div>
            )}

            {step === 4 && accountType === "employer" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Tell us about your business. An administrator will approve your access.
                </p>
                <div>
                  <Label htmlFor="reg">Employer registration number</Label>
                  <Input id="reg" value={regno} onChange={(e) => setRegno(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="role">Your role</Label>
                  <select id="role" className="w-full border rounded-md h-10 px-3 bg-background"
                    value={employerRole} onChange={(e) => setEmployerRole(e.target.value)}>
                    <option value="EMPLOYER_ADMIN">Employer Admin</option>
                    <option value="PAYROLL_OFFICER">Payroll Officer</option>
                    <option value="HR_OFFICER">HR Officer</option>
                    <option value="BENEFIT_CONFIRMATION">Benefit Confirmation User</option>
                  </select>
                </div>
                <Footer onBack={back} onNext={submitLink} nextLabel="Request access" />
              </div>
            )}

            {step === 4 && accountType === "doctor" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Provide your license or registration number. Our team will verify your account.
                </p>
                <div>
                  <Label htmlFor="lic">Provider license / registration number</Label>
                  <Input id="lic" value={license} onChange={(e) => setLicense(e.target.value)} />
                </div>
                <Footer onBack={back} onNext={submitLink} nextLabel="Request access" />
              </div>
            )}

            {/* Step 5 — done */}
            {step === 5 && (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 grid place-items-center">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">You're all set</h2>
                {linkResult === "matched" && (
                  <p className="text-sm text-muted-foreground">
                    We verified your Social Security record. You can now access contributions, claims, and more.
                  </p>
                )}
                {linkResult === "unmatched" && (
                  <p className="text-sm text-muted-foreground">
                    We couldn't verify your record yet. You can still apply for benefits and upload documents — our team will follow up.
                  </p>
                )}
                {linkResult === "pending" && (
                  <p className="text-sm text-muted-foreground">
                    Your access request is awaiting approval. You'll receive a notification when it's approved.
                  </p>
                )}
                <Button size="lg" onClick={goDashboard}>
                  Go to my dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-xs text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Your information is encrypted and audited. We never share without consent.
        </div>
      </div>
    </div>
  );
}

function Footer({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <Button onClick={onNext}>
        {nextLabel} <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
