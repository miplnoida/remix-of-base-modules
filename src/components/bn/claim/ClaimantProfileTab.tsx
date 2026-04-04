/**
 * Claimant Profile Tab — Shows person info from ip_master via adapter
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Phone, Mail, Users } from 'lucide-react';
import { useBnPersonLookup } from '@/hooks/bn/useBnIntegration';
import { BnDetailRow, BnDetailSection, BnEmptyState, BnStatusBadge } from '@/components/bn/shared';
import { formatDateForDisplay } from '@/lib/format-config';

interface ClaimantProfileTabProps {
  ssn: string;
}

export const ClaimantProfileTab: React.FC<ClaimantProfileTabProps> = ({ ssn }) => {
  const { data: person, isLoading, error } = useBnPersonLookup(ssn);

  if (isLoading) return <BnEmptyState type="loading" title="Loading claimant profile..." />;
  if (error) return <BnEmptyState type="error" description="Could not load person record." />;
  if (!person) return <BnEmptyState type="empty" title="Person not found" description={`No record found for SSN ${ssn}`} />;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2"><User className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-base">{person.fullName}</CardTitle>
              <p className="text-sm text-muted-foreground">SSN: {person.ssn}</p>
            </div>
            <BnStatusBadge status={person.status.toUpperCase()} className="ml-auto" size="sm" />
          </div>
        </CardHeader>
        <CardContent>
          <BnDetailSection title="Personal Details">
            <BnDetailRow label="Full Name" value={person.fullName} />
            <BnDetailRow label="SSN" value={person.ssn} />
            <BnDetailRow label="Date of Birth" value={formatDateForDisplay(person.dateOfBirth)} />
            <BnDetailRow label="Gender" value={person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Not-Specified'} />
            <BnDetailRow label="Status" value={<BnStatusBadge status={person.status.toUpperCase()} size="sm" />} />
          </BnDetailSection>
        </CardContent>
      </Card>

      {/* Contact & Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-muted-foreground" /> Contact & Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BnDetailSection title="Contact">
            <BnDetailRow label="Email" value={person.email} />
            <BnDetailRow label="Phone" value={person.phone} />
          </BnDetailSection>

          {person.address && (
            <BnDetailSection title="Address">
              <BnDetailRow label="Line 1" value={person.address.line1} />
              {person.address.line2 && <BnDetailRow label="Line 2" value={person.address.line2} />}
              {person.address.city && <BnDetailRow label="City" value={person.address.city} />}
              {person.address.parish && <BnDetailRow label="Parish" value={person.address.parish} />}
              <BnDetailRow label="Country" value={person.address.country} />
            </BnDetailSection>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
