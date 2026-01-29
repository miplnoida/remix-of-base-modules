import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ERMasterFormData } from '@/types/employerRegistration';
import { useERLookups, LookupItem } from '@/hooks/useERLookups';
import { Loader2 } from 'lucide-react';

interface EntityOverviewStepProps {
  formData: ERMasterFormData;
  onChange: (field: keyof ERMasterFormData, value: any) => void;
  isViewMode: boolean;
  errors?: Record<string, string>;
}

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

// Reusable lookup select component
const LookupSelect = ({
  value,
  onValueChange,
  items,
  placeholder,
  disabled,
  isLoading,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: LookupItem[];
  placeholder: string;
  disabled?: boolean;
  isLoading?: boolean;
}) => (
  <Select value={value || ''} onValueChange={onValueChange} disabled={disabled || isLoading}>
    <SelectTrigger className="bg-background">
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        <SelectValue placeholder={placeholder} />
      )}
    </SelectTrigger>
    <SelectContent className="bg-background z-50">
      {items.map((item) => (
        <SelectItem key={item.code} value={item.code}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default function EntityOverviewStep({ formData, onChange, isViewMode, errors = {} }: EntityOverviewStepProps) {
  const { officeCodes, ownershipCodes, sectorCodes, industrialCodes, isLoading } = useERLookups();

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
            <LookupSelect
              value={formData.office_code || ''}
              onValueChange={(value) => onChange('office_code', value)}
              items={officeCodes}
              placeholder="Select office code"
              disabled={isViewMode}
              isLoading={isLoading}
            />
          </div>
          <div>
            <Label>Ownership Code</Label>
            <LookupSelect
              value={formData.ownership_code || ''}
              onValueChange={(value) => onChange('ownership_code', value)}
              items={ownershipCodes}
              placeholder="Select ownership code"
              disabled={isViewMode}
              isLoading={isLoading}
            />
          </div>
          <div>
            <Label>Sector Code</Label>
            <LookupSelect
              value={formData.sector_code || ''}
              onValueChange={(value) => onChange('sector_code', value)}
              items={sectorCodes}
              placeholder="Select sector code"
              disabled={isViewMode}
              isLoading={isLoading}
            />
          </div>
          <div>
            <Label>Industrial Code</Label>
            <LookupSelect
              value={formData.industrial_code || ''}
              onValueChange={(value) => onChange('industrial_code', value)}
              items={industrialCodes}
              placeholder="Select industrial code"
              disabled={isViewMode}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
