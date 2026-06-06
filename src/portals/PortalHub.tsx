import { Link } from 'react-router-dom';
import { PortalPublicLayout } from '@/portals/_shared/PortalPublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Stethoscope, FileText, Upload, Search, ClipboardCheck, ArrowRight, Phone, Mail, MapPin } from 'lucide-react';

const PORTALS = [
  {
    to: '/claimant',
    title: 'Social Security Self-Service Portal',
    desc: 'Apply for benefits, track claims, view contributions, manage payments and life certificates.',
    icon: Users,
  },
  {
    to: '/employer',
    title: 'Employer Portal',
    desc: 'Submit C3 returns, manage employees, view balances, respond to benefit requests.',
    icon: Building2,
  },
  {
    to: '/doctor',
    title: 'Medical Provider Portal',
    desc: 'Submit medical certificates, reports and assessments for Social Security claims.',
    icon: Stethoscope,
  },
];

const QUICK_SERVICES = [
  { to: '/claimant#apply', title: 'Apply for Benefits', icon: FileText },
  { to: '/employer#c3', title: 'Submit C3', icon: Upload },
  { to: '/claimant#documents', title: 'Upload Documents', icon: Upload },
  { to: '/claimant#claims', title: 'Track a Claim', icon: Search },
  { to: '/external/tasks', title: 'Complete Assigned Task', icon: ClipboardCheck },
];

export default function PortalHub() {
  return (
    <PortalPublicLayout brand="Online Services">
      <section className="bg-gradient-to-b from-muted/40 to-background">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16 text-center">
          <Badge variant="outline" className="mb-3">Powered by Internal LAN · Secure APIs</Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Social Security Online Services</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto md:text-lg">
            A single secure entry point for insured persons, employers and medical providers to interact with the Social Security Board.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10">
        <h2 className="text-xl font-semibold mb-4">Choose your portal</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PORTALS.map(p => (
            <Card key={p.to} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{p.title}</CardTitle>
                </div>
                <CardDescription className="mt-2">{p.desc}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex gap-2">
                <Button asChild className="flex-1">
                  <Link to={p.to}>Open <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={`${p.to}/dashboard`}>Sign in</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 border-y">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <h2 className="text-xl font-semibold mb-4">Quick services</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {QUICK_SERVICES.map(s => (
              <Link key={s.to} to={s.to} className="group">
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><s.icon className="h-4 w-4" /></div>
                    <span className="text-sm font-medium group-hover:text-primary">{s.title}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="text-xl font-semibold mb-4">Help & contact</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-5 flex items-start gap-3"><Phone className="h-5 w-5 text-primary mt-0.5" /><div><p className="font-medium">Call us</p><p className="text-sm text-muted-foreground">+1 (869) 466-5535</p></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-start gap-3"><Mail className="h-5 w-5 text-primary mt-0.5" /><div><p className="font-medium">Email</p><p className="text-sm text-muted-foreground">help@ssb.gov</p></div></CardContent></Card>
          <Card><CardContent className="p-5 flex items-start gap-3"><MapPin className="h-5 w-5 text-primary mt-0.5" /><div><p className="font-medium">Visit</p><p className="text-sm text-muted-foreground">Bay Road, Basseterre · Charlestown, Nevis</p></div></CardContent></Card>
        </div>
      </section>
    </PortalPublicLayout>
  );
}
