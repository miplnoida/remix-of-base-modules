/**
 * Claim Workbench — Section 3: Employer Context
 * 
 * Source: er_master via employerAdapter (read-only lookup)
 * bn_claim.employer_regno (editable in DRAFT/SUBMITTED)
 * 
 * Role visibility: All BN roles
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Search, CheckCircle2, XCircle } from 'lucide-react';
import type { EmployerSummary } from '@/services/bn/integration/contracts';

interface EmployerSectionProps {
  employerRegNo: string | null;
  employer: EmployerSummary | null | undefined;
  employerLoading: boolean;
  isEditable: boolean;
  onRegNoChange: (regNo: string) => void;
  onLookup: () => void;
}

export const EmployerSection: React.FC<EmployerSectionProps> = ({
  employerRegNo, employer, employerLoading, isEditable, onRegNoChange, onLookup,
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <Building2 className="h-4 w-4" /> Employer Context
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* employer_regno — editable in DRAFT */}
        <div>
          <Label className="text-xs text-muted-foreground">Employer Reg. No</Label>
          <div className="flex gap-2 mt-1">
            {isEditable ? (
              <>
                <Input
                  value={employerRegNo || ''}
                  onChange={e => onRegNoChange(e.target.value)}
                  placeholder="Enter reg no"
                  className="flex-1"
                />
                <Button size="icon" variant="outline" onClick={onLookup} disabled={!employerRegNo}>
                  <Search className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <p className="font-mono font-medium text-foreground">{employerRegNo || '(None)'}</p>
            )}
          </div>
        </div>

        {employer && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">Employer Name</Label>
              <p className="text-foreground mt-1 font-medium">{employer.name}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Employer Status</Label>
              <div className="mt-1">
                <Badge variant="outline" className={
                  employer.status === 'A' || employer.status === 'active'
                    ? 'bg-emerald-500/15 text-emerald-700'
                    : 'bg-muted text-muted-foreground'
                }>
                  {employer.status.toUpperCase()}
                </Badge>
              </div>
            </div>
            {employer.address && (
              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                <p className="text-foreground mt-1 text-sm">{employer.address}</p>
              </div>
            )}
          </>
        )}

        {employerLoading && (
          <div className="flex items-center text-muted-foreground text-sm">Loading employer...</div>
        )}

        {!employer && !employerLoading && employerRegNo && (
          <div className="flex items-center gap-1 text-sm text-amber-600">
            <XCircle className="h-4 w-4" /> Employer not found
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);
