
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText } from 'lucide-react';

interface DeclarationTabProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

export const DeclarationTab = ({ formData, handleInputChange }: DeclarationTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Declaration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm">
            I solemnly and sincerely declare that I am the applicant named herein and that the information given on this form is correct
            to the best of my knowledge and belief and that if there is any statement given which I know to be false, I am liable to legal
            action.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="declarationAccepted"
            checked={formData.declarationAccepted}
            onCheckedChange={(checked) => handleInputChange('declarationAccepted', checked)}
          />
          <Label htmlFor="declarationAccepted" className="text-sm font-medium">
            I accept the declaration above *
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="applicantSignature">Signature or mark/right thumb impression of applicant</Label>
            <Input
              id="applicantSignature"
              value={formData.applicantSignature}
              onChange={(e) => handleInputChange('applicantSignature', e.target.value)}
              placeholder="Type your full name"
            />
          </div>
          <div>
            <Label htmlFor="signatureDate">Date (dd/mm/yyyy)</Label>
            <Input
              id="signatureDate"
              type="date"
              value={formData.signatureDate}
              onChange={(e) => handleInputChange('signatureDate', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="witnessName">Name of witness/guardian (Type in BLOCK LETTERS)</Label>
            <Input
              id="witnessName"
              value={formData.witnessName}
              onChange={(e) => handleInputChange('witnessName', e.target.value)}
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          <div>
            <Label htmlFor="witnessDate">Date (dd/mm/yyyy)</Label>
            <Input
              id="witnessDate"
              type="date"
              value={formData.witnessDate}
              onChange={(e) => handleInputChange('witnessDate', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="witnessSignature">Signature of witness/guardian (If applicant is unable to write or is under age 16)</Label>
          <Input
            id="witnessSignature"
            value={formData.witnessSignature}
            onChange={(e) => handleInputChange('witnessSignature', e.target.value)}
            placeholder="Type witness full name"
          />
        </div>
      </CardContent>
    </Card>
  );
};
