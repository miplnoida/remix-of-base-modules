
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2 } from 'lucide-react';

interface EmploymentInfoTabProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
  formerEmployers: any[];
  setFormerEmployers: (employers: any[]) => void;
  caricomCountries: any[];
  setCaricomCountries: (countries: any[]) => void;
}

export const EmploymentInfoTab = ({ 
  formData, 
  handleInputChange, 
  formerEmployers, 
  setFormerEmployers,
  caricomCountries,
  setCaricomCountries
}: EmploymentInfoTabProps) => {
  const addFormerEmployer = () => {
    setFormerEmployers([...formerEmployers, { employer: '', fromYear: '', toYear: '' }]);
  };

  const addCaricomCountry = () => {
    setCaricomCountries([...caricomCountries, { country: '', lastEmployer: '', periodWorked: '' }]);
  };

  return (
    <div className="space-y-6">
      {/* Section 4a - Employment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Section 4a - Employment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="mainOccupation">Main Occupation</Label>
            <Input
              id="mainOccupation"
              value={formData.mainOccupation}
              onChange={(e) => handleInputChange('mainOccupation', e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="employedOnWorkPermit"
              checked={formData.employedOnWorkPermit}
              onCheckedChange={(checked) => handleInputChange('employedOnWorkPermit', checked)}
            />
            <Label htmlFor="employedOnWorkPermit">Are you employed on a work permit?</Label>
          </div>

          {formData.employedOnWorkPermit && (
            <div>
              <Label htmlFor="workPermitExpiration">If yes, state date of expiration</Label>
              <Input
                id="workPermitExpiration"
                type="date"
                value={formData.workPermitExpiration}
                onChange={(e) => handleInputChange('workPermitExpiration', e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="registeredNPF"
                checked={formData.registeredNPF}
                onCheckedChange={(checked) => handleInputChange('registeredNPF', checked)}
              />
              <Label htmlFor="registeredNPF">Have you been previously registered for National Provident Fund in this Federation?</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="registeredSocialSecurity"
                checked={formData.registeredSocialSecurity}
                onCheckedChange={(checked) => handleInputChange('registeredSocialSecurity', checked)}
              />
              <Label htmlFor="registeredSocialSecurity">Have you been previously registered for Social Security in this Federation?</Label>
            </div>
          </div>

          {(formData.registeredNPF || formData.registeredSocialSecurity) && (
            <div>
              <Label className="text-sm font-medium">If you answered 'yes' to being registered in either Fund, please state your former employer(s) and year(s) you worked:</Label>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employer(s)</TableHead>
                    <TableHead>From (year)</TableHead>
                    <TableHead>To (year)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formerEmployers.map((employer, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={employer.employer}
                          onChange={(e) => {
                            const newEmployers = [...formerEmployers];
                            newEmployers[index].employer = e.target.value;
                            setFormerEmployers(newEmployers);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={employer.fromYear}
                          onChange={(e) => {
                            const newEmployers = [...formerEmployers];
                            newEmployers[index].fromYear = e.target.value;
                            setFormerEmployers(newEmployers);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={employer.toYear}
                          onChange={(e) => {
                            const newEmployers = [...formerEmployers];
                            newEmployers[index].toYear = e.target.value;
                            setFormerEmployers(newEmployers);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button type="button" onClick={addFormerEmployer} className="mt-2">
                Add Former Employer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4b - Current Employer */}
      <Card>
        <CardHeader>
          <CardTitle>Section 4b - Current Employer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employerName">Employer's Name</Label>
              <Input
                id="employerName"
                value={formData.employerName}
                onChange={(e) => handleInputChange('employerName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="employerPhone">Phone Number</Label>
              <Input
                id="employerPhone"
                value={formData.employerPhone}
                onChange={(e) => handleInputChange('employerPhone', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employerAddress">Employer's Address</Label>
              <Input
                id="employerAddress"
                value={formData.employerAddress}
                onChange={(e) => handleInputChange('employerAddress', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="employerTown">Town/Village/Island</Label>
              <Input
                id="employerTown"
                value={formData.employerTown}
                onChange={(e) => handleInputChange('employerTown', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="workedInCaricom"
              checked={formData.workedInCaricom}
              onCheckedChange={(checked) => handleInputChange('workedInCaricom', checked)}
            />
            <Label htmlFor="workedInCaricom">Have you ever worked in another CARICOM country?</Label>
          </div>

          {formData.workedInCaricom && (
            <div>
              <Label className="text-sm font-medium">If you answered 'yes' to the above question please list the countries and your last employer in the table below:</Label>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>CARICOM Countries</TableHead>
                    <TableHead>Last Employer</TableHead>
                    <TableHead>Period Worked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caricomCountries.map((country, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={country.country}
                          onChange={(e) => {
                            const newCountries = [...caricomCountries];
                            newCountries[index].country = e.target.value;
                            setCaricomCountries(newCountries);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={country.lastEmployer}
                          onChange={(e) => {
                            const newCountries = [...caricomCountries];
                            newCountries[index].lastEmployer = e.target.value;
                            setCaricomCountries(newCountries);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={country.periodWorked}
                          onChange={(e) => {
                            const newCountries = [...caricomCountries];
                            newCountries[index].periodWorked = e.target.value;
                            setCaricomCountries(newCountries);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button type="button" onClick={addCaricomCountry} className="mt-2">
                Add CARICOM Country
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
