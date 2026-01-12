import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IPFormData } from '../IPRegistrationForm';

interface EmploymentTabProps {
  formData: IPFormData;
  onChange: (field: string, value: any) => void;
  onSave: (data: Partial<IPFormData>) => void;
  errors: Record<string, string>;
  isEditable: boolean;
}

const occupations = [
  'Accountant', 'Administrator', 'Architect', 'Artist', 'Business Owner', 
  'Clerk', 'Doctor', 'Driver', 'Engineer', 'Farmer', 'Fisherman',
  'Lawyer', 'Manager', 'Mechanic', 'Nurse', 'Police Officer',
  'Sales Representative', 'Secretary', 'Self-Employed', 'Student',
  'Teacher', 'Technician', 'Unemployed', 'Other'
];

const workPermitStatuses = ['Yes', 'No', 'Pending', 'Expired', 'Not Applicable'];
const npfStatuses = ['Active', 'Inactive', 'Pending', 'Exempt'];
const placeOfResidences = ['RES', 'NON-RES', 'Visitor'];
const citizenshipStatuses = ['Y', 'N']; // Y = Citizen, N = Non-Citizen
const signatureStatuses = ['Yes', 'No', 'Pending'];

export default function EmploymentTab({ formData, onChange, onSave, errors, isEditable }: EmploymentTabProps) {
  const handleBlur = (field: string) => {
    if (isEditable) {
      onSave({ [field]: formData[field as keyof IPFormData] });
    }
  };

  const requiresWorkPermit = formData.citizenship === 'N' && formData.place_of_residence === 'RES';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Employment Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Occupation */}
        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Select 
            value={formData.occupation || ''} 
            onValueChange={(v) => { onChange('occupation', v); onSave({ occupation: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Occupation" />
            </SelectTrigger>
            <SelectContent>
              {occupations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Work Permit */}
        <div className="space-y-2">
          <Label htmlFor="work_permit_status">
            Work Permit
            {requiresWorkPermit && <span className="text-destructive"> *</span>}
          </Label>
          <Select 
            value={formData.work_permit_status || ''} 
            onValueChange={(v) => { onChange('work_permit_status', v); onSave({ work_permit_status: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger className={errors.work_permit_status ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select Work Permit Status" />
            </SelectTrigger>
            <SelectContent>
              {workPermitStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.work_permit_status && <p className="text-xs text-destructive">{errors.work_permit_status}</p>}
        </div>

        {/* NPF */}
        <div className="space-y-2">
          <Label htmlFor="npf_status">NPF</Label>
          <Select 
            value={formData.npf_status || ''} 
            onValueChange={(v) => { onChange('npf_status', v); onSave({ npf_status: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select NPF Status" />
            </SelectTrigger>
            <SelectContent>
              {npfStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Application Date */}
        <div className="space-y-2">
          <Label htmlFor="application_date">Application Date</Label>
          <Input
            id="application_date"
            type="date"
            value={formData.application_date || ''}
            onChange={(e) => onChange('application_date', e.target.value)}
            onBlur={() => handleBlur('application_date')}
            disabled={!isEditable}
          />
        </div>

        {/* Date Resident */}
        <div className="space-y-2">
          <Label htmlFor="date_resident">Date Resident</Label>
          <Input
            id="date_resident"
            type="date"
            value={formData.date_resident || ''}
            onChange={(e) => onChange('date_resident', e.target.value)}
            onBlur={() => handleBlur('date_resident')}
            disabled={!isEditable}
          />
        </div>

        {/* Place of Residence */}
        <div className="space-y-2">
          <Label htmlFor="place_of_residence">Place of Residence</Label>
          <Select 
            value={formData.place_of_residence || ''} 
            onValueChange={(v) => { onChange('place_of_residence', v); onSave({ place_of_residence: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Place of Residence" />
            </SelectTrigger>
            <SelectContent>
              {placeOfResidences.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Work Permit Expiration */}
        <div className="space-y-2">
          <Label htmlFor="work_permit_expiry">
            Work Permit Expiration
            {requiresWorkPermit && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id="work_permit_expiry"
            type="date"
            value={formData.work_permit_expiry || ''}
            onChange={(e) => onChange('work_permit_expiry', e.target.value)}
            onBlur={() => handleBlur('work_permit_expiry')}
            disabled={!isEditable}
            className={errors.work_permit_expiry ? 'border-destructive' : ''}
          />
          {errors.work_permit_expiry && <p className="text-xs text-destructive">{errors.work_permit_expiry}</p>}
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-8">Additional Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Citizenship */}
        <div className="space-y-2">
          <Label htmlFor="citizenship">Citizenship</Label>
          <Select 
            value={formData.citizenship || ''} 
            onValueChange={(v) => { onChange('citizenship', v); onSave({ citizenship: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Citizenship Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Y">Citizen</SelectItem>
              <SelectItem value="N">Non-Citizen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Signature on File */}
        <div className="space-y-2">
          <Label htmlFor="signature_on_file">Signature on File</Label>
          <Select 
            value={formData.signature_on_file || ''} 
            onValueChange={(v) => { onChange('signature_on_file', v); onSave({ signature_on_file: v }); }}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Signature Status" />
            </SelectTrigger>
            <SelectContent>
              {signatureStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Work Permit Warning */}
      {requiresWorkPermit && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          <strong>Note:</strong> Non-citizens with Resident status must have a valid work permit with a future expiry date.
        </div>
      )}
    </div>
  );
}
