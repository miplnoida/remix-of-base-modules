import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  HelpCircle, LifeBuoy, Building2, FileText, Upload, Search, Wrench, Phone, Mail,
} from 'lucide-react';

const SECTIONS = [
  { icon: HelpCircle, title: 'FAQs', desc: 'Common questions about benefits, eligibility, and the portal.', to: '/claimant/help/faqs' },
  { icon: LifeBuoy, title: 'Contact SSB', desc: 'Phone, email, and in-person office support.', to: '/claimant/help/contact' },
  { icon: Building2, title: 'Office Locations', desc: 'Find your nearest Social Security office.', to: '/claimant/help/offices' },
  { icon: FileText, title: 'How to Apply', desc: 'Step-by-step guide to submitting a benefit claim.', to: '/claimant/apply' },
  { icon: Upload, title: 'Uploading Documents', desc: 'Supported formats, sizes, and best practices.', to: '/claimant/documents' },
  { icon: Search, title: 'Track a Claim', desc: 'Check status, next steps, and required actions.', to: '/claimant/claims' },
  { icon: Wrench, title: 'Technical Support', desc: 'Login, password, and portal issues.', to: '/claimant/help/technical' },
];

export default function HelpCenterPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-primary" /> Help &amp; Support</CardTitle>
          <CardDescription>
            Get help with your account, applications, payments, and documents. For urgent issues call SSB directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <Link key={s.title} to={s.to}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-2 p-4">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Customer Service: 465-2535</div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> info@socialsecurity.kn</div>
        </CardContent>
      </Card>
    </div>
  );
}
