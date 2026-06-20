/**
 * Country Legal References — Benefits Country Pack screen.
 * Now uses the shared, module-agnostic LegalReferenceManagement component
 * over the central `legal_reference` master.
 */
import React from 'react';
import { BnCountryProvider, useBnCountry } from '@/contexts/BnCountryContext';
import CountrySelector from '@/components/bn/country/CountrySelector';
import { PageHeader } from '@/components/common/PageHeader';
import LegalReferenceManagement from '@/components/legal-reference/LegalReferenceManagement';

const Content: React.FC = () => {
  const { activeCountryCode } = useBnCountry();
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Legal References"
        subtitle="Structured master of acts, chapters, sections and regulations — shared across Benefits, Legal and future modules"
        breadcrumbs={[{ label: 'Benefit Management' }, { label: 'Country Pack' }, { label: 'Legal References' }]}
      />
      <CountrySelector />
      {activeCountryCode && (
        <LegalReferenceManagement
          countryCode={activeCountryCode}
          defaultTag="BN"
          title="Country Legal References"
          subtitle="Acts, regulations and policies used by Benefits eligibility, formulas, rate tables, templates and decisions"
        />
      )}
    </div>
  );
};

const CountryLegalRefs: React.FC = () => (
  <BnCountryProvider>
    <Content />
  </BnCountryProvider>
);
export default CountryLegalRefs;
