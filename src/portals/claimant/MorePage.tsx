import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  User, Phone, Bell, Lock, IdCard, Users, FolderOpen, Scale, Landmark,
  ShieldCheck, GraduationCap, ClipboardCheck, HelpCircle, BellRing, Building2,
} from 'lucide-react';

const SECTIONS: { title: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    title: 'My account',
    items: [
      { to: '/claimant/account', label: 'My Profile', icon: User },
      { to: '/claimant/account/contacts', label: 'Contact Information', icon: Phone },
      { to: '/claimant/account/preferences', label: 'Communication Preferences', icon: Bell },
      { to: '/claimant/account/security', label: 'Security Settings', icon: Lock },
      { to: '/claimant/account/identity', label: 'Linked SSN / Identity', icon: IdCard },
      { to: '/claimant/account/relationships', label: 'Relationships', icon: Users },
    ],
  },
  {
    title: 'Compliance & certificates',
    items: [
      { to: '/claimant/compliance/life', label: 'Life Certificate', icon: ShieldCheck },
      { to: '/claimant/compliance/school', label: 'School Certificate', icon: GraduationCap },
      { to: '/claimant/compliance/verification', label: 'Verification Requests', icon: ClipboardCheck },
    ],
  },
  {
    title: 'More',
    items: [
      { to: '/claimant/bank-details', label: 'Bank Details / EFT', icon: Landmark },
      { to: '/claimant/appeals', label: 'Appeals / Reconsideration', icon: Scale },
      { to: '/claimant/documents', label: 'Document Center', icon: FolderOpen },
      { to: '/claimant/notifications', label: 'Notifications', icon: BellRing },
      { to: '/claimant/help', label: 'Help &amp; Support', icon: HelpCircle },
      { to: '/claimant/help/offices', label: 'Office Locations', icon: Building2 },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>More</CardTitle>
          <CardDescription>Account, compliance, and additional portal options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {section.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-md border p-3 text-sm transition-colors hover:bg-muted/60">
                      <Icon className="h-4 w-4 text-primary" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
