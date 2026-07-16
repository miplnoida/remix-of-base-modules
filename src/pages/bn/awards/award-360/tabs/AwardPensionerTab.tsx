/**
 * BN-AWARD360-B3D — Pensioner deep view.
 * Read-only. No mutation imports. No hardcoded /insured-persons/:ssn.
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KV, dt, TabLoading, TabErrorState, TabEmptyState } from '../components';
import {
  Award360HealthGrid,
  Award360WarningList,
  Award360RelatedRecords,
  Award360RestrictedNotice,
} from '../components/Award360DeepPrimitives';
import { useAwardPensionerDeep } from '../useAward360DeepQueries';
import type { PensionerAccess } from '@/services/bn/awards/award360DeepService';

export interface AwardPensionerTabProps {
  awardId: string;
  ssn?: string | null;
  access: PensionerAccess;
  enabled?: boolean;
}

export const AwardPensionerTab: React.FC<AwardPensionerTabProps> = ({ awardId, access, enabled = true }) => {
  const { data, isLoading, error, refetch } = useAwardPensionerDeep(awardId, access, enabled);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <TabEmptyState title="No pensioner linked to this award" />;

  const { identity, contact, payee, paymentProfile, related, routes, warnings, partialWarnings } = data;

  return (
    <div className="space-y-4">
      <Award360WarningList warnings={warnings} partialWarnings={partialWarnings} />

      <Card>
        <CardHeader><CardTitle className="text-base">Identity</CardTitle></CardHeader>
        <CardContent>
          <Award360HealthGrid
            columns={3}
            items={[
              { label: 'Full name', value: identity.fullName },
              { label: 'SSN (masked)', value: identity.ssnMasked },
              { label: 'Person ID', value: identity.canonicalPersonId },
              { label: 'Date of birth', value: dt(identity.dob) },
              { label: 'Age', value: identity.age ?? '—' },
              { label: 'Sex', value: identity.sex },
              { label: 'Nationality', value: identity.nationality },
              { label: 'Residency', value: identity.residencyStatus },
              { label: 'Person status', value: identity.personStatus,
                tone: identity.personStatus && !['A','V','R','ACTIVE','VERIFIED','REGISTERED']
                  .includes(identity.personStatus.toUpperCase()) ? 'warn' : 'ok' },
              { label: 'Deceased', value: identity.isDeceased ? 'Yes' : 'No',
                tone: identity.isDeceased ? 'breach' : 'ok' },
              { label: 'Date of death', value: dt(identity.dateOfDeath) },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Contact &amp; communication</CardTitle></CardHeader>
        <CardContent>
          <Award360HealthGrid
            columns={3}
            items={[
              { label: 'Mobile', value: contact.mobile },
              { label: 'Telephone', value: contact.phone },
              { label: 'Email', value: contact.email },
              { label: 'Residential address', value: contact.residentialAddress },
              { label: 'Mailing address', value: contact.mailingAddress },
              { label: 'Preferred channel', value: contact.preferredChannel },
              { label: 'Preferred channel fulfillable', value: contact.preferredChannelFulfillable ? 'Yes' : 'No',
                tone: contact.preferredChannelFulfillable ? 'ok' : 'warn' },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payee &amp; representative</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
            <KV label="Pensioner is payee" value={payee.pensionerIsPayee ? 'Yes' : 'No'} />
            <KV label="Payee name" value={payee.payeeName} />
            <KV label="Payee relationship" value={payee.payeeRelationship} />
            <KV label="Guardian / representative" value={payee.guardianOrRepresentative} />
            <KV label="Relationship verified" value={payee.relationshipVerified == null ? '—' : payee.relationshipVerified ? 'Yes' : 'No'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment profile</CardTitle></CardHeader>
        <CardContent>
          {paymentProfile.restricted ? (
            <Award360RestrictedNotice message="Payment profile is not available under current access." />
          ) : !paymentProfile.present ? (
            <TabEmptyState title="No active payment profile" hint={paymentProfile.pendingChangeRequest ? 'A profile change request is pending.' : undefined} />
          ) : (
            <Award360HealthGrid
              columns={3}
              items={[
                { label: 'Method', value: paymentProfile.method },
                { label: 'Currency', value: paymentProfile.currency },
                { label: 'Bank', value: paymentProfile.bank },
                { label: 'Account (masked)', value: paymentProfile.accountMasked },
                { label: 'Verified', value: paymentProfile.verified ? 'Yes' : 'No',
                  tone: paymentProfile.verified ? 'ok' : 'warn' },
                { label: 'Verified date', value: dt(paymentProfile.verifiedDate) },
                { label: 'Effective date', value: dt(paymentProfile.effectiveDate) },
                { label: 'Active', value: paymentProfile.active ? 'Yes' : 'No',
                  tone: paymentProfile.active ? 'ok' : 'warn' },
                { label: 'Blocked', value: paymentProfile.blocked ? 'Yes' : 'No',
                  tone: paymentProfile.blocked ? 'breach' : 'ok', hint: paymentProfile.blockReason ?? undefined },
                { label: 'Pending change', value: paymentProfile.pendingChangeRequest ? paymentProfile.pendingChangeRequest.status ?? 'PENDING' : 'No',
                  tone: paymentProfile.pendingChangeRequest ? 'warn' : 'ok' },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Award360RelatedRecords
          title="Related claims"
          items={related.relatedClaims.map((c) => ({
            id: c.id, primary: c.claimNumber, secondary: c.status, route: c.route,
          }))}
        />
        <Award360RelatedRecords
          title="Related awards"
          items={related.relatedAwards.map((a) => ({
            id: a.id, primary: a.awardNumber, secondary: a.status, route: a.route,
          }))}
        />
      </div>

      <Award360RelatedRecords
        title="Dependants"
        items={related.dependants.map((d, i) => ({
          id: `dep-${i}`, primary: d.fullName, secondary: [d.relationship, d.verified != null ? (d.verified ? 'verified' : 'unverified') : null].filter(Boolean).join(' · '),
        }))}
        emptyMessage="No dependants recorded."
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" disabled={!routes.person360}>
          <a href={routes.person360 ?? '#'} data-testid="link-person-360">Open Person 360</a>
        </Button>
        <Button asChild size="sm" variant="outline" disabled={!routes.personProfile}>
          <a href={routes.personProfile ?? '#'} data-testid="link-person-profile">Open person profile</a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={routes.paymentProfiles} data-testid="link-payment-profiles">Open payment profiles</a>
        </Button>
      </div>
    </div>
  );
};
