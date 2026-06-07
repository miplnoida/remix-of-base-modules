/**
 * Claim Workbench — Section 2: Contributor & Claimant Details
 * 
 * Source: ip_master via personAdapter (read-only)
 * Shows: SSN, Full Name, DOB, Gender, Status, Phone, Email, Address
 * Also shows: contact_phone, contact_email from bn_claim (editable)
 * 
 * Role visibility: All BN roles
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MapPin, Calendar, Hash, AlertTriangle } from 'lucide-react';
import { formatDisplayDate } from '@/lib/dateFormat';
import type { PersonSummary } from '@/services/bn/integration/contracts';

interface ContributorSectionProps {
  person: PersonSummary | null | undefined;
  isLoading: boolean;
  claimContactPhone?: string;
  claimContactEmail?: string;
  bankAccount?: string;
  bankRoutingNumber?: string;
  isEditable: boolean;
  onUpdate: (field: string, value: string) => void;
}

const statusColor: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700',
  deceased: 'bg-destructive/15 text-destructive',
  suspended: 'bg-amber-500/15 text-amber-700',
  pending: 'bg-muted text-muted-foreground',
};

export const ContributorSection: React.FC<ContributorSectionProps> = ({
  person, isLoading, claimContactPhone, claimContactEmail,
  bankAccount, bankRoutingNumber, isEditable, onUpdate,
}) => {
  if (isLoading) {
    return <Card><CardContent className="p-6 text-muted-foreground">Loading contributor...</CardContent></Card>;
  }

  if (!person) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-6 flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span>Contributor not found in registry</span>
        </CardContent>
      </Card>
    );
  }

  const genderLabel = person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Not-Specified';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <User className="h-4 w-4" /> Contributor / Claimant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Registry fields — read-only from ip_master */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReadField icon={Hash} label="SSN" value={person.ssn} mono />
          <ReadField icon={User} label="Full Name" value={person.fullName} />
          <ReadField icon={Calendar} label="Date of Birth" value={person.dateOfBirth ? formatDateForDisplay(person.dateOfBirth) : '—'} />
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Gender</Label>
            <p className="text-foreground mt-1">{genderLabel}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Registry Status</Label>
            <Badge variant="outline" className={`mt-1 ${statusColor[person.status] || ''}`}>
              {person.status.toUpperCase()}
            </Badge>
          </div>
          {person.phone && <ReadField icon={Phone} label="Registry Phone" value={person.phone} />}
          {person.email && <ReadField icon={Mail} label="Registry Email" value={person.email} />}
          {person.address && (
            <ReadField
              icon={MapPin}
              label="Address"
              value={[person.address.line1, person.address.line2, person.address.city, person.address.parish].filter(Boolean).join(', ')}
              className="col-span-2"
            />
          )}
        </div>

        {/* Claim-level contact (editable) */}
        <div className="border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Claim Contact Information</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Contact Phone</Label>
              {isEditable ? (
                <Input value={claimContactPhone || ''} onChange={e => onUpdate('contact_phone', e.target.value)} className="mt-1" />
              ) : (
                <p className="text-foreground mt-1">{claimContactPhone || '—'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Contact Email</Label>
              {isEditable ? (
                <Input value={claimContactEmail || ''} onChange={e => onUpdate('contact_email', e.target.value)} className="mt-1" />
              ) : (
                <p className="text-foreground mt-1">{claimContactEmail || '—'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bank Account</Label>
              {isEditable ? (
                <Input value={bankAccount || ''} onChange={e => onUpdate('bank_account', e.target.value)} className="mt-1" />
              ) : (
                <p className="font-mono text-foreground mt-1">{bankAccount || '—'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Bank Routing #</Label>
              {isEditable ? (
                <Input value={bankRoutingNumber || ''} onChange={e => onUpdate('bank_routing_number', e.target.value)} className="mt-1" />
              ) : (
                <p className="font-mono text-foreground mt-1">{bankRoutingNumber || '—'}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function ReadField({ icon: Icon, label, value, mono, className }: {
  icon: any; label: string; value: string; mono?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</Label>
      <p className={`text-foreground mt-1 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
