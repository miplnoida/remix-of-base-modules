import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Globe, CreditCard, FileText, Users, MapPin, Scale, Package, Settings, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from './CountrySelector';
import CountryProfileEditor from './CountryProfileEditor';
import { getCountryProfile } from '@/services/bn/countryProfileService';
import PaymentCapabilitySummary from './PaymentCapabilitySummary';

const StatusBadge: React.FC<{ configured: boolean; count?: number }> = ({ configured, count }) => (
  <Badge variant={configured ? 'default' : 'destructive'} className="gap-1">
    {configured ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {configured ? (count !== undefined ? `${count} configured` : 'Configured') : 'Not configured'}
  </Badge>
);

const CountryPackDashboard: React.FC = () => {
  const { countryPack, isLoading, activeCountryCode, currency } = useBnCountry();
  const [editProfile, setEditProfile] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['bn', 'country-profile', activeCountryCode],
    queryFn: () => getCountryProfile(activeCountryCode),
    enabled: !!activeCountryCode,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading country pack...</div>;

  const pack = countryPack;
  const sections = [
    { icon: Globe, label: 'ID / SSN Rules', count: pack?.idRules?.length ?? 0, path: '/bn/config/country/id-rules' },
    { icon: MapPin, label: 'Address Model', count: pack?.addressModel?.length ?? 0, path: '/bn/config/country/address-model' },
    { icon: Users, label: 'Participant Types', count: pack?.participantTypes?.length ?? 0, path: '/bn/config/country/participant-types' },
    { icon: CreditCard, label: 'Payment Methods', count: pack?.paymentConfig?.length ?? 0, path: '/bn/config/country/payment-config' },
    { icon: Scale, label: 'Legal References', count: pack?.legalRefs?.length ?? 0, path: '/bn/config/country/legal-refs' },
    { icon: Package, label: 'Products', count: pack?.products?.length ?? 0, path: '/bn/products' },
    { icon: FileText, label: 'Document Types', count: pack?.docTypes?.length ?? 0, path: '/bn/config/service-doc-types' },
  ];

  // Validation summary — surface gaps before the pack is "complete enough" to drive products.
  const issues: string[] = [];
  if (!profile?.office_name) issues.push('Social security office name not set');
  if (!profile?.office_address) issues.push('Office address not set');
  if (!profile?.letterhead_logo_url) issues.push('Letterhead logo not configured (letters will lack branding)');
  if (!pack?.idRules?.length) issues.push('No ID rules configured');
  if (!pack?.addressModel?.length) issues.push('No address-model fields configured');
  if (!pack?.participantTypes?.length) issues.push('No participant types configured');
  if (!pack?.paymentConfig?.length) issues.push('No payment methods configured');
  if (!pack?.legalRefs?.length) issues.push('No legal references configured');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Country Pack: {pack?.country?.country_name ?? activeCountryCode}</h2>
          <p className="text-muted-foreground">
            Currency: {currency.symbol} ({currency.code}) · Locale: {(pack?.country as any)?.locale ?? 'en'}
            {profile?.timezone ? ` · TZ: ${profile.timezone}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CountrySelector />
          <Button variant="outline" size="sm" onClick={() => setEditProfile(true)}>
            <Settings className="h-4 w-4 mr-1" /> Edit Country Profile
          </Button>
        </div>
      </div>

      {/* Country profile summary card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Organisation & Formats</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <Field label="Office" value={profile?.office_name} />
          <Field label="Phone" value={profile?.office_phone} />
          <Field label="Email" value={profile?.office_email} />
          <Field label="Website" value={profile?.office_website} />
          <Field label="Date Format" value={profile?.date_format} />
          <Field label="Number Format" value={profile?.number_format} />
          <Field label="Phone Format" value={profile?.phone_format} />
          <Field label="Language" value={profile?.default_language} />
          <div className="col-span-2 md:col-span-4">
            <Field label="Address" value={profile?.office_address} multiline />
          </div>
        </CardContent>
      </Card>

      {issues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Country Pack validation — {issues.length} issue{issues.length > 1 ? 's' : ''}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
              {issues.map((i) => (<li key={i}>{i}</li>))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sections.map((s) => (
          <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => (window.location.href = s.path)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <s.icon className="h-4 w-4 text-muted-foreground" />
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge configured={s.count > 0} count={s.count > 0 ? s.count : undefined} />
            </CardContent>
          </Card>
        ))}
      </div>

      {activeCountryCode && <PaymentCapabilitySummary countryCode={activeCountryCode} />}

      <CountryProfileEditor countryCode={activeCountryCode} open={editProfile} onOpenChange={setEditProfile} />
    </div>
  );
};

const Field: React.FC<{ label: string; value?: string | null; multiline?: boolean }> = ({ label, value, multiline }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={multiline ? 'whitespace-pre-line' : 'truncate'}>{value || <span className="text-muted-foreground italic">Not set</span>}</div>
  </div>
);

export default CountryPackDashboard;
