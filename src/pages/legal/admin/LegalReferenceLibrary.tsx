/**
 * LegalReferenceLibrary — Legal Module admin screen for managing the
 * shared legal_reference master, scoped to the Legal module via tag.
 */
import React from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import LegalReferenceManagement from '@/components/legal-reference/LegalReferenceManagement';

const COUNTRY_CODE = (import.meta as any).env?.VITE_DEFAULT_COUNTRY_CODE || 'KN';

const LegalReferenceLibrary: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Legal References"
        subtitle="Acts, regulations and policies cited by Legal cases, notices, orders and settlements"
        breadcrumbs={[{ label: 'Legal' }, { label: 'Legal Admin' }, { label: 'Legal References' }]}
      />
      <LegalReferenceManagement
        countryCode={COUNTRY_CODE}
        defaultTag="LG"
        title="Legal Reference Library"
        subtitle="Reusable legal citations available to Legal cases and documents"
      />
    </div>
  );
};

export default LegalReferenceLibrary;
