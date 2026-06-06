import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useExternalProfile } from '@/portals/_shared/externalHooks';
import { useClaimantPersona } from '@/hooks/external/useClaimantPersona';

function PersonalTab() {
  const { data, isLoading } = useExternalProfile();
  if (isLoading) return <Skeleton className="h-48 w-full" />;
  const p = data?.profile;
  if (!p)
    return (
      <p className="text-sm text-muted-foreground">
        No profile on record. Link your SSN to populate this section from ip_master.
      </p>
    );
  return (
    <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 text-sm">
      <dt className="text-muted-foreground">SSN</dt><dd className="font-mono">{p.ssn}</dd>
      <dt className="text-muted-foreground">First name</dt><dd>{p.first_name ?? '—'}</dd>
      <dt className="text-muted-foreground">Surname</dt><dd>{p.last_name ?? '—'}</dd>
      <dt className="text-muted-foreground">Date of birth</dt><dd>{p.dob ?? '—'}</dd>
      <dt className="text-muted-foreground">Gender</dt><dd>{p.gender ?? '—'}</dd>
      <dt className="text-muted-foreground">Nationality</dt><dd>{(p as any).nationality ?? '—'}</dd>
    </dl>
  );
}

function ContactsTab() {
  const { data, isLoading } = useExternalProfile();
  if (isLoading) return <Skeleton className="h-32 w-full" />;
  const p = data?.profile as any;
  return (
    <dl className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 text-sm">
      <dt className="text-muted-foreground">Mobile phone</dt><dd>{p?.mobile_phone ?? '—'}</dd>
      <dt className="text-muted-foreground">Home phone</dt><dd>{p?.home_phone ?? '—'}</dd>
      <dt className="text-muted-foreground">Email</dt><dd>{p?.email ?? '—'}</dd>
      <dt className="text-muted-foreground">Postal address</dt><dd>{p?.postal_address ?? '—'}</dd>
      <dt className="text-muted-foreground">Residential address</dt><dd>{p?.residential_address ?? '—'}</dd>
    </dl>
  );
}

function PreferencesTab() {
  return (
    <p className="text-sm text-muted-foreground">
      Choose how you receive letters, SMS and email. (Sourced from <code>user_notification_preferences</code>.)
    </p>
  );
}

function SecurityTab() {
  const { persona } = useClaimantPersona();
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">SSN linked:</span>
        {persona?.personSsn ? (
          <Badge>Verified</Badge>
        ) : (
          <Badge variant="secondary">Not linked</Badge>
        )}
      </div>
      <p className="text-muted-foreground">
        Password, MFA, and active sessions are managed in <code>mfa_config</code>.
      </p>
    </div>
  );
}

export default function AccountProfilePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Account</CardTitle>
        <CardDescription>Personal, contact, preferences and security.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="personal">
          <TabsList>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="pt-4"><PersonalTab /></TabsContent>
          <TabsContent value="contacts" className="pt-4"><ContactsTab /></TabsContent>
          <TabsContent value="preferences" className="pt-4"><PreferencesTab /></TabsContent>
          <TabsContent value="security" className="pt-4"><SecurityTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
