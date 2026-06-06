import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface InfoPageProps {
  title: string;
  intro: string;
  bullets: string[];
  ctaLabel: string;
  ctaTo: string;
}

function InfoPage({ title, intro, bullets, ctaLabel, ctaTo }: InfoPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
      <p className="text-lg text-muted-foreground mb-8">{intro}</p>
      <Card>
        <CardContent className="p-6">
          <ul className="space-y-3">
            {bullets.map((b, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-6 border-t">
            <Button asChild>
              <Link to={ctaTo}>{ctaLabel} <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PublicServices() {
  return (
    <InfoPage
      title="Online services"
      intro="Everything you can do online with your Social Security account."
      bullets={[
        "Apply for benefits (sickness, maternity, pension, funeral, survivor)",
        "View contribution and earnings history (verified accounts only)",
        "Track active and past claims",
        "Update bank details for benefit payments",
        "Upload supporting documents",
        "Receive messages and certificates from the Board",
      ]}
      ctaLabel="Create your account"
      ctaTo="/public/register"
    />
  );
}

export function PublicBenefits() {
  return (
    <InfoPage
      title="Benefits you can apply for"
      intro="A short overview of benefit types. Eligibility is checked when you apply."
      bullets={[
        "Sickness benefit — short-term wage replacement during illness",
        "Maternity benefit — paid leave for new mothers",
        "Age (Old-Age) pension — monthly pension after retirement age",
        "Survivor benefit — for spouse and children of a deceased contributor",
        "Funeral grant — one-time grant toward funeral costs",
        "Invalidity benefit — for long-term incapacity",
      ]}
      ctaLabel="Apply now"
      ctaTo="/claimant/apply"
    />
  );
}

export function PublicContributions() {
  return (
    <InfoPage
      title="Contributions"
      intro="Information for insured persons and employers about contributions."
      bullets={[
        "Your contributions fund the benefits you and your family rely on",
        "Insured persons can view their statement online (verified accounts)",
        "Employers file C3 contributions every month",
        "Self-employed persons can register and pay voluntary contributions",
        "Missing weeks can be reviewed and corrected with supporting evidence",
      ]}
      ctaLabel="View my contributions"
      ctaTo="/claimant/contributions/statements"
    />
  );
}

export function PublicEmployers() {
  return (
    <InfoPage
      title="For Employers"
      intro="File contributions, manage employees, and stay compliant — online."
      bullets={[
        "File monthly C3 contribution returns electronically",
        "Add and update employees",
        "View invoices, receipts, and payment history",
        "Authorise Payroll Officers, HR Officers, and Benefit Confirmation users",
        "Get notified about due dates and compliance actions",
      ]}
      ctaLabel="Register your business"
      ctaTo="/public/register?type=employer"
    />
  );
}

export function PublicMedicalProviders() {
  return (
    <InfoPage
      title="For Medical Providers"
      intro="Complete medical certificates and reports online — no paper, no faxing."
      bullets={[
        "Receive and respond to medical certificate requests",
        "Submit follow-up medical reports",
        "Manage your provider profile",
        "Access secure task links sent to you by the Board",
      ]}
      ctaLabel="Register as a provider"
      ctaTo="/public/register?type=doctor"
    />
  );
}

export function PublicContact() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-3">Contact us</h1>
      <p className="text-muted-foreground mb-8">
        We're here to help. Reach out by phone, email, or visit a local office.
      </p>
      <Card>
        <CardContent className="p-6 grid sm:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="font-semibold mb-1">Phone</div>
            <div className="text-muted-foreground">Main switchboard</div>
            <div>+1 (869) 000-0000</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Email</div>
            <div className="text-muted-foreground">General enquiries</div>
            <div>info@socialsecurity.gov</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Office hours</div>
            <div>Mon – Fri, 8:00 AM to 4:00 PM</div>
          </div>
          <div>
            <div className="font-semibold mb-1">Address</div>
            <div>Social Security Board headquarters</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PublicHelp() {
  const faqs = [
    { q: "Do I need an account to apply for a benefit?", a: "Yes — but creating one takes only a few minutes. You can apply even if we can't link your Social Security record right away." },
    { q: "What if I don't have an email address?", a: "You can register with just a mobile number. We'll send a one-time code by SMS." },
    { q: "Can I see my contributions immediately after registering?", a: "Only after we verify your Social Security record. If we can't verify automatically, our team will follow up." },
    { q: "I received a secure task link — what do I do?", a: "Use the 'I have a secure link' option on the registration page. You don't need a full account." },
    { q: "How is my information protected?", a: "All data is encrypted in transit and at rest. Sensitive actions require strong verification." },
  ];
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-3">Help &amp; FAQs</h1>
      <p className="text-muted-foreground mb-8">Quick answers to common questions.</p>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="font-semibold mb-1">{f.q}</div>
              <p className="text-sm text-muted-foreground">{f.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function PublicLogin() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold mb-2">Sign in</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Use your registered email and password.
      </p>
      <Button asChild className="w-full">
        <Link to="/login">Continue to sign in</Link>
      </Button>
      <p className="text-sm mt-4 text-muted-foreground">
        New here? <Link to="/public/register" className="text-primary underline">Create an account</Link>
      </p>
    </div>
  );
}
