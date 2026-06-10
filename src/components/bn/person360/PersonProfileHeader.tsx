/**
 * Person 360 — Profile Header
 * 
 * Source: ip_master via personAdapter
 * Read-only display of contributor identity
 * Role visibility: All BN roles
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Phone, MapPin, Calendar, Hash } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/format-config';
import type { PersonSummary } from '@/services/bn/integration/contracts';

interface PersonProfileHeaderProps {
  person: PersonSummary;
  contributionWeeks?: number;
}

const statusColor: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  deceased: 'bg-destructive/15 text-destructive border-destructive/30',
  suspended: 'bg-amber-500/15 text-amber-700 border-amber-300',
  pending: 'bg-muted text-muted-foreground border-border',
};

export const PersonProfileHeader: React.FC<PersonProfileHeaderProps> = ({ person, contributionWeeks }) => {
  const initials = person.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const genderLabel = person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Not-Specified';

  return (
    <Card className="overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
      <CardContent className="pt-5">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Avatar */}
          <Avatar className="h-20 w-20 border-4 border-background shadow-md">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="t-page-title">{person.fullName}</h1>
              <Badge variant="outline" className={statusColor[person.status] || statusColor.pending}>
                {person.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 mt-4 text-sm">
              <InfoField icon={Hash} label="SSN" value={person.ssn} />
              <InfoField icon={Calendar} label="Date of Birth" value={person.dateOfBirth ? formatDateForDisplay(person.dateOfBirth) : '—'} />
              <InfoField icon={User} label="Gender" value={genderLabel} />
              {contributionWeeks !== undefined && (
                <InfoField icon={Hash} label="Contribution Weeks" value={String(contributionWeeks)} />
              )}
              {person.email && <InfoField icon={Mail} label="Email" value={person.email} />}
              {person.phone && <InfoField icon={Phone} label="Phone" value={person.phone} />}
              {person.address && (
                <InfoField
                  icon={MapPin}
                  label="Address"
                  value={[person.address.line1, person.address.line2, person.address.city, person.address.parish]
                    .filter(Boolean)
                    .join(', ')}
                  className="sm:col-span-2"
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

function InfoField({ icon: Icon, label, value, className }: { icon: any; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-start gap-2 ${className || ''}`}>
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-foreground font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
