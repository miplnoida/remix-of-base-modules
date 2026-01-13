import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Caribbean +1 countries plus common international codes
const countryCodes = [
  { code: '+1-KN', label: '(+1) St. Kitts & Nevis', dialCode: '+1' },
  { code: '+1-AG', label: '(+1) Antigua & Barbuda', dialCode: '+1' },
  { code: '+1-BB', label: '(+1) Barbados', dialCode: '+1' },
  { code: '+1-DM', label: '(+1) Dominica', dialCode: '+1' },
  { code: '+1-GD', label: '(+1) Grenada', dialCode: '+1' },
  { code: '+1-JM', label: '(+1) Jamaica', dialCode: '+1' },
  { code: '+1-LC', label: '(+1) St. Lucia', dialCode: '+1' },
  { code: '+1-VC', label: '(+1) St. Vincent', dialCode: '+1' },
  { code: '+1-TT', label: '(+1) Trinidad & Tobago', dialCode: '+1' },
  { code: '+1-US', label: '(+1) United States', dialCode: '+1' },
  { code: '+1-CA', label: '(+1) Canada', dialCode: '+1' },
  { code: '+44', label: '(+44) United Kingdom', dialCode: '+44' },
  { code: '+91', label: '(+91) India', dialCode: '+91' },
  { code: '+86', label: '(+86) China', dialCode: '+86' },
  { code: '+61', label: '(+61) Australia', dialCode: '+61' },
  { code: '+49', label: '(+49) Germany', dialCode: '+49' },
  { code: '+33', label: '(+33) France', dialCode: '+33' },
];

interface PhoneInputProps {
  label: string;
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (number: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  id?: string;
}

// Format phone as XXX-XXX-XXXX
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

// Extract only digits from formatted value
const unformatPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 10);
};

export default function PhoneInput({
  label,
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  onBlur,
  disabled = false,
  required = false,
  error,
  id,
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(formatPhoneNumber(phoneNumber));

  useEffect(() => {
    setDisplayValue(formatPhoneNumber(phoneNumber));
  }, [phoneNumber]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const digits = unformatPhoneNumber(rawValue);
    setDisplayValue(formatPhoneNumber(rawValue));
    onPhoneNumberChange(digits);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="flex gap-2">
        <Select
          value={countryCode || '+1-KN'}
          onValueChange={onCountryCodeChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            {countryCodes.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          value={displayValue}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder="XXX-XXX-XXXX"
          maxLength={12}
          disabled={disabled}
          className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// Helper to combine dial code and phone into single string
export const combinePhoneNumber = (countryCode: string, phoneNumber: string): string => {
  const country = countryCodes.find(c => c.code === countryCode);
  const dialCode = country?.dialCode || '+1';
  return `${dialCode}${phoneNumber}`;
};

// Helper to parse combined phone number back to country code and number
export const parsePhoneNumber = (combined: string): { countryCode: string; phoneNumber: string } => {
  if (!combined) return { countryCode: '+1-KN', phoneNumber: '' };
  
  // Default to St. Kitts for +1 numbers
  if (combined.startsWith('+1')) {
    return { countryCode: '+1-KN', phoneNumber: combined.slice(2) };
  }
  
  // Check other country codes
  for (const c of countryCodes) {
    if (combined.startsWith(c.dialCode) && c.code !== '+1-KN') {
      return { countryCode: c.code, phoneNumber: combined.slice(c.dialCode.length) };
    }
  }
  
  return { countryCode: '+1-KN', phoneNumber: combined };
};
