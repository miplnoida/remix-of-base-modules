import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useBnCountry } from '@/contexts/BnCountryContext';

interface ParticipantTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  role?: string; // Filter by participant_role: CLAIMANT, BENEFICIARY, etc.
  productCode?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
}

const ParticipantTypeSelector: React.FC<ParticipantTypeSelectorProps> = ({
  value, onChange, role, productCode, label = 'Participant Type', disabled, error,
}) => {
  const { participantTypes } = useBnCountry();

  const filtered = participantTypes.filter(pt => {
    if (!pt.is_active) return false;
    if (role && pt.participant_role !== role) return false;
    if (productCode && pt.allowed_products && pt.allowed_products.length > 0 && !pt.allowed_products.includes(productCode)) return false;
    return true;
  });

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={error ? 'border-destructive' : ''}>
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {filtered.map(pt => (
            <SelectItem key={pt.type_code} value={pt.type_code}>
              {pt.type_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

export default ParticipantTypeSelector;
