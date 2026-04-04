import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBnCountry } from '@/contexts/BnCountryContext';

interface DynamicAddressFormProps {
  values: Record<string, string>;
  onChange: (fieldCode: string, value: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

const DynamicAddressForm: React.FC<DynamicAddressFormProps> = ({ values, onChange, errors, disabled }) => {
  const { addressFields } = useBnCountry();

  if (!addressFields.length) return <p className="text-sm text-muted-foreground">No address model configured for this country.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {addressFields.filter(f => f.is_active).map(field => (
        <div key={field.field_code} className="space-y-1">
          <Label htmlFor={`addr-${field.field_code}`} className="text-sm font-medium">
            {field.field_label}
            {field.is_required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {field.field_type === 'SELECT' ? (
            <Select
              value={values[field.field_code] || ''}
              onValueChange={v => onChange(field.field_code, v)}
              disabled={disabled}
            >
              <SelectTrigger id={`addr-${field.field_code}`}>
                <SelectValue placeholder={`Select ${field.field_label}`} />
              </SelectTrigger>
              <SelectContent>
                {/* Options would come from options_source API — placeholder items */}
                <SelectItem value="option_1">{field.field_label} Option 1</SelectItem>
                <SelectItem value="option_2">{field.field_label} Option 2</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`addr-${field.field_code}`}
              value={values[field.field_code] || ''}
              onChange={e => onChange(field.field_code, e.target.value)}
              placeholder={field.field_label}
              disabled={disabled}
              className={errors?.[field.field_code] ? 'border-destructive' : ''}
            />
          )}

          {errors?.[field.field_code] && (
            <p className="text-xs text-destructive mt-1">{errors[field.field_code]}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default DynamicAddressForm;
