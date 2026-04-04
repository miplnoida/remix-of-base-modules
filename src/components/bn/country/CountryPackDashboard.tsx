import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Globe, CreditCard, FileText, Users, MapPin, Scale, Package } from 'lucide-react';
import { useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from './CountrySelector';

const StatusBadge: React.FC<{ configured: boolean; count?: number }> = ({ configured, count }) => (
  <Badge variant={configured ? 'default' : 'destructive'} className="gap-1">
    {configured ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {configured ? (count !== undefined ? `${count} configured` : 'Configured') : 'Not configured'}
  </Badge>
);

const CountryPackDashboard: React.FC = () => {
  const { countryPack, isLoading, activeCountryCode, currency } = useBnCountry();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Country Pack: {pack?.country?.country_name ?? activeCountryCode}</h2>
          <p className="text-muted-foreground">Currency: {currency.symbol} ({currency.code}) · Locale: {(pack?.country as any)?.locale ?? 'en'}</p>
        </div>
        <CountrySelector />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sections.map(s => (
          <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = s.path}>
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
    </div>
  );
};

export default CountryPackDashboard;
