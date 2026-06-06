import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, FileText, HeartPulse, Building2, Stethoscope, ShieldCheck, LinkIcon,
} from "lucide-react";

export default function PublicHome() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background border-b">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full mb-4">
              <ShieldCheck className="h-3.5 w-3.5" /> Secure self-service portal
            </div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
              Social Security services, simpler online.
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Apply for benefits, file employer contributions, or complete medical
              certificates from anywhere — no paperwork queues.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/public/register">Create your account <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/public/login">Sign in</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              You can register even if we can't verify your record today —
              you'll still be able to apply for benefits.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: HeartPulse, title: "Apply for benefits" },
              { icon: FileText, title: "Track your claim" },
              { icon: Building2, title: "File contributions" },
              { icon: Stethoscope, title: "Complete medical forms" },
            ].map((t, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <t.icon className="h-6 w-6 text-primary mb-3" />
                  <div className="font-medium">{t.title}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold mb-2">Who is this for?</h2>
        <p className="text-muted-foreground mb-8">Pick the option that fits you. You can change later.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { to: "/public/register?type=claimant", icon: HeartPulse, title: "Insured person / Claimant", desc: "Apply for benefits, track claims, upload documents." },
            { to: "/public/register?type=employer", icon: Building2, title: "Employer", desc: "File C3 contributions, manage employees, view invoices." },
            { to: "/public/register?type=doctor", icon: Stethoscope, title: "Doctor / Medical provider", desc: "Complete medical certificates and reports online." },
            { to: "/public/register?type=task", icon: LinkIcon, title: "I have a secure link", desc: "Complete a task someone shared with you — no account needed." },
          ].map((p) => (
            <Link key={p.to} to={p.to} className="group">
              <Card className="h-full border-2 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <p.icon className="h-7 w-7 text-primary mb-3" />
                  <div className="font-semibold mb-1">{p.title}</div>
                  <p className="text-sm text-muted-foreground mb-4">{p.desc}</p>
                  <span className="text-sm text-primary inline-flex items-center group-hover:gap-2 gap-1 transition-all">
                    Continue <ArrowRight className="h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Reassurance */}
      <section className="bg-muted/40 border-y">
        <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-6">
          {[
            { title: "Verified and secure", desc: "Your information is encrypted and audited end-to-end." },
            { title: "Email or phone — your choice", desc: "Use whichever works for you. Either one verifies your account." },
            { title: "Help when you need it", desc: "Plain-language guides and human support available." },
          ].map((b, i) => (
            <div key={i}>
              <ShieldCheck className="h-6 w-6 text-primary mb-2" />
              <div className="font-semibold mb-1">{b.title}</div>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
