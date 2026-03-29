import React from 'react';
import { PageShell } from '@/components/common';
import { AuditReportCenter } from '@/components/audit/reports';

export default function AuditReports() {
  return (
    <PageShell
      title="Audit Report Center"
      subtitle="Create, manage, and distribute professional audit reports across the organization"
      breadcrumbs={[{ label: 'Internal Audit' }, { label: 'Report Center' }]}
    >
      <AuditReportCenter />
    </PageShell>
  );
}
