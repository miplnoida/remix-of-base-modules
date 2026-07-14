import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KV, dt, TabLoading, TabErrorState, TabEmptyState } from '../components';
import { Button } from '@/components/ui/button';
import { useAwardPensioner } from '../useAward360Queries';

export const AwardPensionerTab: React.FC<{ awardId: string; ssn?: string | null }> = ({ awardId, ssn }) => {
  const { data, isLoading, error, refetch } = useAwardPensioner(awardId);
  if (isLoading) return <TabLoading />;
  if (error) return <TabErrorState error={error} onRetry={() => refetch()} />;
  if (!data) return <TabEmptyState title="No pensioner linked to this award" />;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pensioner / Payee</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <KV label="Full name" value={data.fullName} />
          <KV label="SSN (masked)" value={data.ssnMasked} />
          <KV label="Date of birth" value={dt(data.dob)} />
          <KV label="Age" value={data.age} />
          <KV label="Sex" value={data.sex} />
          <KV label="Nationality" value={data.nationality} />
          <KV label="Deceased" value={data.isDeceased ? `Yes (${dt(data.dateOfDeath)})` : 'No'} />
          <KV label="Mobile" value={data.mobile} />
          <KV label="Phone" value={data.phone} />
          <KV label="Email" value={data.email} />
          <KV label="Residential address" value={data.residentialAddress} />
          <KV label="Mailing address" value={data.mailingAddress} />
          <KV label="Preferred channel" value={data.preferredChannel} />
          <KV label="Verified payment profile" value={data.verifiedPaymentProfile ? 'Yes' : 'No'} />
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline"><a href={`/bn/person-360/${ssn ?? ''}`}>Open Person 360</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`/insured-persons/${ssn ?? ''}`}>Open IP profile</a></Button>
        </div>
      </CardContent>
    </Card>
  );
};
