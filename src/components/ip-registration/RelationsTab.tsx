import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserRound, Heart, Eye, Award } from 'lucide-react';
import { IPMasterFormData } from '@/types/ipRegistration';

interface RelationsTabProps {
  formData: IPMasterFormData;
  updateField: (field: keyof IPMasterFormData, value: any) => void;
  isEditable: boolean;
}

const RELATION_TYPES = [
  { value: 'contact', label: 'Emergency Contact', icon: UserRound },
  { value: 'parent', label: 'Parents', icon: Users },
  { value: 'spouse', label: 'Spouse', icon: Heart },
  { value: 'witness', label: 'Witness', icon: Eye },
  { value: 'beneficiary', label: 'Beneficiary', icon: Award },
];

// Helper component for view mode display - shows blank for empty values
const ViewModeField: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => (
  <div>
    <Label className="text-muted-foreground">{label}</Label>
    <div className="h-10 flex items-center px-3 py-2 bg-muted/30 rounded-md text-sm">
      {value || ''}
    </div>
  </div>
);

export const RelationsTab: React.FC<RelationsTabProps> = ({
  formData,
  updateField,
  isEditable,
}) => {
  const [selectedRelationType, setSelectedRelationType] = useState<string>('contact');

  const renderContactFields = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4" />
          Emergency Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isEditable ? (
            <>
              <div>
                <Label htmlFor="contact">Contact Name</Label>
                <Input id="contact" value={formData.contact} onChange={(e) => updateField('contact', e.target.value)} maxLength={35} />
              </div>
              <div>
                <Label htmlFor="contact_relation">Relation</Label>
                <Input id="contact_relation" value={formData.contact_relation} onChange={(e) => updateField('contact_relation', e.target.value)} maxLength={20} />
              </div>
              <div>
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => updateField('contact_email', e.target.value)} maxLength={40} />
              </div>
            </>
          ) : (
            <>
              <ViewModeField label="Contact Name" value={formData.contact} />
              <ViewModeField label="Relation" value={formData.contact_relation} />
              <ViewModeField label="Email" value={formData.contact_email} />
            </>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditable ? (
            <>
              <div>
                <Label htmlFor="contact_addr1">Address Line 1</Label>
                <Input id="contact_addr1" value={formData.contact_addr1} onChange={(e) => updateField('contact_addr1', e.target.value)} maxLength={30} />
              </div>
              <div>
                <Label htmlFor="contact_addr2">Address Line 2</Label>
                <Input id="contact_addr2" value={formData.contact_addr2} onChange={(e) => updateField('contact_addr2', e.target.value)} maxLength={30} />
              </div>
            </>
          ) : (
            <>
              <ViewModeField label="Address Line 1" value={formData.contact_addr1} />
              <ViewModeField label="Address Line 2" value={formData.contact_addr2} />
            </>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditable ? (
            <>
              <div>
                <Label htmlFor="contact_phone">Phone Number</Label>
                <Input id="contact_phone" value={formData.contact_phone} onChange={(e) => updateField('contact_phone', e.target.value)} maxLength={10} />
              </div>
              <div>
                <Label htmlFor="contact_mobile">Mobile Number</Label>
                <Input id="contact_mobile" value={formData.contact_mobile} onChange={(e) => updateField('contact_mobile', e.target.value)} maxLength={10} />
              </div>
            </>
          ) : (
            <>
              <ViewModeField label="Phone Number" value={formData.contact_phone} />
              <ViewModeField label="Mobile Number" value={formData.contact_mobile} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderParentFields = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Parents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditable ? (
            <>
              <div>
                <Label htmlFor="father_name">Father's Name</Label>
                <Input id="father_name" value={formData.father_name} onChange={(e) => updateField('father_name', e.target.value)} maxLength={35} />
              </div>
              <div>
                <Label htmlFor="mother_name">Mother's Name</Label>
                <Input id="mother_name" value={formData.mother_name} onChange={(e) => updateField('mother_name', e.target.value)} maxLength={35} />
              </div>
            </>
          ) : (
            <>
              <ViewModeField label="Father's Name" value={formData.father_name} />
              <ViewModeField label="Mother's Name" value={formData.mother_name} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderSpouseFields = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4" />
          Spouse Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isEditable ? (
            <>
              <div><Label htmlFor="spouse_name">Spouse Name</Label><Input id="spouse_name" value={formData.spouse_name} onChange={(e) => updateField('spouse_name', e.target.value)} maxLength={35} /></div>
              <div><Label htmlFor="spouse_ssn">Spouse SSN</Label><Input id="spouse_ssn" value={formData.spouse_ssn} onChange={(e) => updateField('spouse_ssn', e.target.value)} maxLength={6} /></div>
              <div><Label htmlFor="spouse_dob">Spouse Date of Birth</Label><Input id="spouse_dob" type="date" value={formData.spouse_dob} onChange={(e) => updateField('spouse_dob', e.target.value)} /></div>
            </>
          ) : (
            <>
              <ViewModeField label="Spouse Name" value={formData.spouse_name} />
              <ViewModeField label="Spouse SSN" value={formData.spouse_ssn} />
              <ViewModeField label="Spouse Date of Birth" value={formData.spouse_dob} />
            </>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditable ? (
            <>
              <div><Label htmlFor="spouse_addr1">Spouse Address Line 1</Label><Input id="spouse_addr1" value={formData.spouse_addr1} onChange={(e) => updateField('spouse_addr1', e.target.value)} maxLength={30} /></div>
              <div><Label htmlFor="spouse_addr2">Spouse Address Line 2</Label><Input id="spouse_addr2" value={formData.spouse_addr2} onChange={(e) => updateField('spouse_addr2', e.target.value)} maxLength={30} /></div>
            </>
          ) : (
            <>
              <ViewModeField label="Spouse Address Line 1" value={formData.spouse_addr1} />
              <ViewModeField label="Spouse Address Line 2" value={formData.spouse_addr2} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderWitnessFields = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Eye className="h-4 w-4" />Witness</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditable ? (
            <>
              <div><Label htmlFor="witness_name">Witness Name</Label><Input id="witness_name" value={formData.witness_name} onChange={(e) => updateField('witness_name', e.target.value)} maxLength={35} /></div>
              <div><Label htmlFor="date_witnessed">Date Witnessed</Label><Input id="date_witnessed" type="date" value={formData.date_witnessed} onChange={(e) => updateField('date_witnessed', e.target.value)} /></div>
            </>
          ) : (
            <>
              <ViewModeField label="Witness Name" value={formData.witness_name} />
              <ViewModeField label="Date Witnessed" value={formData.date_witnessed} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderBeneficiaryFields = () => (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Award className="h-4 w-4" />Beneficiary</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {isEditable ? (
          <div><Label htmlFor="beneficiary">Beneficiary Name</Label><Input id="beneficiary" value={formData.beneficiary} onChange={(e) => updateField('beneficiary', e.target.value)} maxLength={35} /></div>
        ) : (
          <ViewModeField label="Beneficiary Name" value={formData.beneficiary} />
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isEditable ? (
            <>
              <div><Label htmlFor="ben_addr1">Beneficiary Address Line 1</Label><Input id="ben_addr1" value={formData.ben_addr1} onChange={(e) => updateField('ben_addr1', e.target.value)} maxLength={30} /></div>
              <div><Label htmlFor="ben_addr2">Beneficiary Address Line 2</Label><Input id="ben_addr2" value={formData.ben_addr2} onChange={(e) => updateField('ben_addr2', e.target.value)} maxLength={30} /></div>
            </>
          ) : (
            <>
              <ViewModeField label="Beneficiary Address Line 1" value={formData.ben_addr1} />
              <ViewModeField label="Beneficiary Address Line 2" value={formData.ben_addr2} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderSelectedRelation = () => {
    switch (selectedRelationType) {
      case 'contact': return renderContactFields();
      case 'parent': return renderParentFields();
      case 'spouse': return renderSpouseFields();
      case 'witness': return renderWitnessFields();
      case 'beneficiary': return renderBeneficiaryFields();
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Select Relation Type</CardTitle></CardHeader>
        <CardContent>
          <div className="w-full md:w-1/3">
            <Label htmlFor="relation_type">Relation Type</Label>
            <Select value={selectedRelationType} onValueChange={setSelectedRelationType}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Select relation type" /></SelectTrigger>
              <SelectContent className="bg-background z-50">
                {RELATION_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {renderSelectedRelation()}
    </div>
  );
};
