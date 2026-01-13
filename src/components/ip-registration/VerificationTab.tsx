import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { IPMasterFormData } from '@/types/ipRegistration';
import { useVerifyTypes } from '@/hooks/useIPMasterLookups';

interface VerificationTabProps {
  formData: IPMasterFormData;
  updateField: (field: keyof IPMasterFormData, value: any) => void;
  isEditable: boolean;
}

export const VerificationTab: React.FC<VerificationTabProps> = ({
  formData,
  updateField,
  isEditable,
}) => {
  const { data: verifyTypes = [], isLoading: loadingVerifyTypes } = useVerifyTypes();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Document Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="verify_birth_code">Birth Status Verification</Label>
            <Select
              value={formData.verify_birth_code}
              onValueChange={(value) => updateField('verify_birth_code', value)}
              disabled={!isEditable || loadingVerifyTypes}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {verifyTypes.map((doc) => (
                  <SelectItem key={doc.code} value={doc.code}>{doc.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="verify_name_code">Name Status Verification</Label>
            <Select
              value={formData.verify_name_code}
              onValueChange={(value) => updateField('verify_name_code', value)}
              disabled={!isEditable || loadingVerifyTypes}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {verifyTypes.map((doc) => (
                  <SelectItem key={doc.code} value={doc.code}>{doc.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="verify_marital_code">Marital Status Verification</Label>
            <Select
              value={formData.verify_marital_code}
              onValueChange={(value) => updateField('verify_marital_code', value)}
              disabled={!isEditable || loadingVerifyTypes}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {verifyTypes.map((doc) => (
                  <SelectItem key={doc.code} value={doc.code}>{doc.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="verify_death_code">Death Status Verification</Label>
            <Select
              value={formData.verify_death_code}
              onValueChange={(value) => updateField('verify_death_code', value)}
              disabled={!isEditable || loadingVerifyTypes}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {verifyTypes.map((doc) => (
                  <SelectItem key={doc.code} value={doc.code}>{doc.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date_verified">Date of Verification</Label>
            <Input
              id="date_verified"
              type="date"
              value={formData.date_verified}
              onChange={(e) => updateField('date_verified', e.target.value)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label htmlFor="verified_by">Verified By</Label>
            <Input
              id="verified_by"
              value={formData.verified_by}
              onChange={(e) => updateField('verified_by', e.target.value)}
              disabled={!isEditable}
              maxLength={5}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
