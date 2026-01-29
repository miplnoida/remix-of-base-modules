import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ERMasterFormData } from '@/types/employerRegistration';

interface EntityOverviewStepProps {
  formData: ERMasterFormData;
  onChange: (field: keyof ERMasterFormData, value: any) => void;
  isViewMode: boolean;
  errors?: Record<string, string>;
}

// Lookup data (can be fetched from API later)
const OFFICE_CODES = [
  { code: 'STK', label: 'STK - St. Kitts' },
  { code: 'NVS', label: 'NVS - Nevis' },
];

const OWNERSHIP_CODES = [
  { code: 'GOV', label: "GOV - Gov't Ministry/Dept." },
  { code: 'PUB', label: 'PUB - Public Company' },
  { code: 'PVT', label: 'PVT - Private Company' },
  { code: 'SOL', label: 'SOL - Sole Proprietor' },
  { code: 'PTN', label: 'PTN - Partnership' },
];

const SECTOR_CODES = [
  { code: 'G', label: 'G - Government' },
  { code: 'P', label: 'P - Private' },
  { code: 'S', label: 'S - Self-Employed' },
  { code: 'O', label: 'O - Other' },
];

const INDUSTRIAL_CODES = [
  { code: '0000', label: '0000 - Unknown' },
  { code: '9112', label: '9112 - Profes. Organ. Activities' },
  { code: '5110', label: '5110 - Wholesale Trade' },
  { code: '4510', label: '4510 - Motor Vehicle Sales' },
  { code: '6110', label: '6110 - Wired Telecommunications' },
];

// Input with character counter component
const InputWithCounter = ({ 
  value, 
  onChange, 
  maxLength, 
  disabled, 
  placeholder, 
  error,
  type = 'text'
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  maxLength: number; 
  disabled?: boolean; 
  placeholder?: string;
  error?: boolean;
  type?: string;
}) => (
  <div className="relative">
    <Input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
    />
    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
      {value?.length || 0}/{maxLength}
    </span>
  </div>
);

export default function EntityOverviewStep({ formData, onChange, isViewMode, errors = {} }: EntityOverviewStepProps) {
  return (
    <div className="space-y-6">
      {/* General Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">General Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className={errors.name ? 'text-destructive' : ''}>
              Employer Name <span className="text-destructive">*</span>
            </Label>
            <InputWithCounter
              value={formData.name || ''}
              onChange={(e) => onChange('name', e.target.value)}
              disabled={isViewMode}
              maxLength={40}
              placeholder="Enter employer name"
              error={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label>Trade Name</Label>
            <InputWithCounter
              value={formData.trade_name || ''}
              onChange={(e) => onChange('trade_name', e.target.value)}
              disabled={isViewMode}
              maxLength={40}
              placeholder="Enter trade name"
            />
          </div>
          <div>
            <Label className={errors.email ? 'text-destructive' : ''}>
              E-Mail Address <span className="text-destructive">*</span>
            </Label>
            <InputWithCounter
              type="email"
              value={formData.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
              disabled={isViewMode}
              maxLength={40}
              placeholder="Enter email address"
              error={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label className={errors.hq_addr1 ? 'text-destructive' : ''}>
              HQ Address 1 <span className="text-destructive">*</span>
            </Label>
            <InputWithCounter
              value={formData.hq_addr1 || ''}
              onChange={(e) => onChange('hq_addr1', e.target.value)}
              disabled={isViewMode}
              maxLength={25}
              placeholder="Enter HQ address"
              error={!!errors.hq_addr1}
            />
            {errors.hq_addr1 && <p className="text-xs text-destructive mt-1">{errors.hq_addr1}</p>}
          </div>
          <div>
            <Label>HQ Address 2</Label>
            <InputWithCounter
              value={formData.hq_addr2 || ''}
              onChange={(e) => onChange('hq_addr2', e.target.value)}
              disabled={isViewMode}
              maxLength={25}
              placeholder="Enter HQ address 2"
            />
          </div>
          <div>
            <Label className={errors.maddr1 ? 'text-destructive' : ''}>
              Mailing Address 1 <span className="text-destructive">*</span>
            </Label>
            <InputWithCounter
              value={formData.maddr1 || ''}
              onChange={(e) => onChange('maddr1', e.target.value)}
              disabled={isViewMode}
              maxLength={25}
              placeholder="Enter mailing address"
              error={!!errors.maddr1}
            />
            {errors.maddr1 && <p className="text-xs text-destructive mt-1">{errors.maddr1}</p>}
          </div>
          <div>
            <Label>Mailing Address 2</Label>
            <InputWithCounter
              value={formData.maddr2 || ''}
              onChange={(e) => onChange('maddr2', e.target.value)}
              disabled={isViewMode}
              maxLength={25}
              placeholder="Enter mailing address 2"
            />
          </div>
        </div>
      </div>

      {/* Organizational Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Organizational Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Parent Registration Number</Label>
            <InputWithCounter
              value={formData.parent_regno || ''}
              onChange={(e) => onChange('parent_regno', e.target.value)}
              disabled={isViewMode}
              maxLength={6}
              placeholder="Enter parent reg. no."
            />
          </div>
          <div>
            <Label>Office Code</Label>
            <Select
              value={formData.office_code || ''}
              onValueChange={(value) => onChange('office_code', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select office code" />
              </SelectTrigger>
              <SelectContent>
                {OFFICE_CODES.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ownership Code</Label>
            <Select
              value={formData.ownership_code || ''}
              onValueChange={(value) => onChange('ownership_code', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select ownership code" />
              </SelectTrigger>
              <SelectContent>
                {OWNERSHIP_CODES.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Sector Code</Label>
            <Select
              value={formData.sector_code || ''}
              onValueChange={(value) => onChange('sector_code', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sector code" />
              </SelectTrigger>
              <SelectContent>
                {SECTOR_CODES.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Industrial Code</Label>
            <Select
              value={formData.industrial_code || ''}
              onValueChange={(value) => onChange('industrial_code', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industrial code" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIAL_CODES.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
