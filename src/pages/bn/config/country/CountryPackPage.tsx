import React from 'react';
import { BnCountryProvider } from '@/contexts/BnCountryContext';
import CountryPackDashboard from '@/components/bn/country/CountryPackDashboard';
import { PageHeader } from '@/components/common/PageHeader';

const CountryPackPage: React.FC = () => (
  <BnCountryProvider>
    <div className="p-6 space-y-6">
      <PageHeader
        title="Country Pack Configuration"
        subtitle="Configure country-specific settings for the multi-country benefit platform"
        breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Pack' }]}
      />
      <CountryPackDashboard />
    </div>
  </BnCountryProvider>
);

export default CountryPackPage;
