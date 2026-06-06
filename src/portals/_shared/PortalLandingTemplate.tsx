import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PortalPublicLayout } from '@/portals/_shared/PortalPublicLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, LucideIcon } from 'lucide-react';

export interface LandingCard { title: string; desc: string; icon: LucideIcon; to?: string }
export interface LandingCta { label: string; to: string; variant?: 'default' | 'outline' | 'secondary' }

interface Props {
  brand: string;
  role: string;
  hero: { title: string; subtitle: string };
  ctas: LandingCta[];
  cards: LandingCard[];
  dashboardPath: string;
  footer?: ReactNode;
}

export function PortalLandingTemplate({ brand, role, hero, ctas, cards, dashboardPath, footer }: Props) {
  return (
    <PortalPublicLayout brand={brand} role={role} signInTo={dashboardPath}>
      <section className="bg-gradient-to-b from-muted/40 to-background">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{hero.title}</h1>
            <p className="mt-3 text-muted-foreground md:text-lg">{hero.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {ctas.map(c => (
                <Button key={c.to + c.label} asChild variant={c.variant ?? 'default'}>
                  <Link to={c.to}>{c.label} <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10">
        <h2 className="text-xl font-semibold mb-4">What you can do here</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(c => {
            const Inner = (
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center"><c.icon className="h-4 w-4" /></div>
                    <CardTitle className="text-base">{c.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-2">{c.desc}</CardDescription>
                </CardHeader>
              </Card>
            );
            return c.to ? <Link key={c.title} to={c.to}>{Inner}</Link> : <div key={c.title}>{Inner}</div>;
          })}
        </div>
      </section>

      {footer}

      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Ready to get started?</p>
            <p className="text-sm text-muted-foreground">Sign in to your secure {brand}.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild><Link to={dashboardPath}>Sign in</Link></Button>
            <Button asChild variant="outline"><Link to="/portal">Other portals</Link></Button>
          </div>
        </div>
      </section>
    </PortalPublicLayout>
  );
}
