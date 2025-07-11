import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from './DatePicker';

export const RegisterPersonForm = () => {
  const [formData, setFormData] = useState({
    ssn: '',
    surname: '',
    firstname: '',
    middlename: '',
    previousName: '',
    dob: undefined as Date | undefined,
    sex: '',
    alias: '',
    primaryOccup: '',
    selfRefNo: '',
    aspNum: '',
    status: 'Pending',
    residentAddr1: '',
    residentAddr2: '',
    district: '',
    mailAddr1: '',
    mailAddr2: '',
    birthPlace: '',
    nationality: '',
    dateOfResidency: undefined as Date | undefined,
    maritalStatus: '',
    dateMarried: undefined as Date | undefined,
    spouseName: '',
    spouseAddr: '',
    fatherName: '',
    motherName: '',
    beneficiary: '',
    benAddr: '',
    contactName: '',
    contactRelation: '',
    contactAddr: '',
    phone: '',
    email: '',
    workPermit: 'No',
    npf: 'Yes'
  });

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ssn">SSN *</Label>
              <Input
                id="ssn"
                value={formData.ssn}
                onChange={(e) => setFormData({...formData, ssn: e.target.value})}
                placeholder="Enter SSN"
                required
              />
            </div>
            <div>
              <Label htmlFor="selfRefNo">Self Reference No *</Label>
              <Input
                id="selfRefNo"
                value={formData.selfRefNo}
                onChange={(e) => setFormData({...formData, selfRefNo: e.target.value})}
                placeholder="Enter self reference number"
                required
              />
            </div>
            <div>
              <Label htmlFor="aspNum">ASP Number</Label>
              <Input
                id="aspNum"
                value={formData.aspNum}
                onChange={(e) => setFormData({...formData, aspNum: e.target.value})}
                placeholder="Enter ASP number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="surname">Surname *</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => setFormData({...formData, surname: e.target.value})}
                placeholder="Enter surname"
                required
              />
            </div>
            <div>
              <Label htmlFor="firstname">First Name *</Label>
              <Input
                id="firstname"
                value={formData.firstname}
                onChange={(e) => setFormData({...formData, firstname: e.target.value})}
                placeholder="Enter first name"
                required
              />
            </div>
            <div>
              <Label htmlFor="middlename">Middle Name</Label>
              <Input
                id="middlename"
                value={formData.middlename}
                onChange={(e) => setFormData({...formData, middlename: e.target.value})}
                placeholder="Enter middle name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="previousName">Previous Name</Label>
              <Input
                id="previousName"
                value={formData.previousName}
                onChange={(e) => setFormData({...formData, previousName: e.target.value})}
                placeholder="Enter previous name if applicable"
              />
            </div>
            <div>
              <Label htmlFor="alias">Alias</Label>
              <Input
                id="alias"
                value={formData.alias}
                onChange={(e) => setFormData({...formData, alias: e.target.value})}
                placeholder="Enter alias if applicable"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Birth Information */}
      <Card>
        <CardHeader>
          <CardTitle>Birth Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date of Birth *</Label>
              <DatePicker
                date={formData.dob}
                onSelect={(date) => setFormData({...formData, dob: date})}
                placeholder="Select date of birth"
              />
            </div>
            <div>
              <Label htmlFor="sex">Sex *</Label>
              <Select value={formData.sex} onValueChange={(value) => setFormData({...formData, sex: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthPlace">Place of Birth *</Label>
              <Input
                id="birthPlace"
                value={formData.birthPlace}
                onChange={(e) => setFormData({...formData, birthPlace: e.target.value})}
                placeholder="Enter place of birth"
                required
              />
            </div>
            <div>
              <Label htmlFor="nationality">Nationality *</Label>
              <Select value={formData.nationality} onValueChange={(value) => setFormData({...formData, nationality: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kittitian">Kittitian</SelectItem>
                  <SelectItem value="Nevisian">Nevisian</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Date of Residency</Label>
            <DatePicker
              date={formData.dateOfResidency}
              onSelect={(date) => setFormData({...formData, dateOfResidency: date})}
              placeholder="Select residency date"
            />
          </div>
        </CardContent>
      </Card>

      {/* Marital Status */}
      <Card>
        <CardHeader>
          <CardTitle>Marital Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select value={formData.maritalStatus} onValueChange={(value) => setFormData({...formData, maritalStatus: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select marital status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                  <SelectItem value="Common Law">Common Law</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Married</Label>
              <DatePicker
                date={formData.dateMarried}
                onSelect={(date) => setFormData({...formData, dateMarried: date})}
                placeholder="Select marriage date"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="spouseName">Spouse Name</Label>
              <Input
                id="spouseName"
                value={formData.spouseName}
                onChange={(e) => setFormData({...formData, spouseName: e.target.value})}
                placeholder="Enter spouse name"
              />
            </div>
            <div>
              <Label htmlFor="spouseAddr">Spouse Address</Label>
              <Textarea
                id="spouseAddr"
                value={formData.spouseAddr}
                onChange={(e) => setFormData({...formData, spouseAddr: e.target.value})}
                placeholder="Enter spouse address"
                rows={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fatherName">Father's Name</Label>
              <Input
                id="fatherName"
                value={formData.fatherName}
                onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                placeholder="Enter father's name"
              />
            </div>
            <div>
              <Label htmlFor="motherName">Mother's Name</Label>
              <Input
                id="motherName"
                value={formData.motherName}
                onChange={(e) => setFormData({...formData, motherName: e.target.value})}
                placeholder="Enter mother's name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle>Address Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Residential Address</h4>
              <div>
                <Label htmlFor="residentAddr1">Address Line 1 *</Label>
                <Input
                  id="residentAddr1"
                  value={formData.residentAddr1}
                  onChange={(e) => setFormData({...formData, residentAddr1: e.target.value})}
                  placeholder="Enter address line 1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="residentAddr2">Address Line 2</Label>
                <Input
                  id="residentAddr2"
                  value={formData.residentAddr2}
                  onChange={(e) => setFormData({...formData, residentAddr2: e.target.value})}
                  placeholder="Enter address line 2"
                />
              </div>
              <div>
                <Label htmlFor="district">District *</Label>
                <Select value={formData.district} onValueChange={(value) => setFormData({...formData, district: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Basseterre Zone 01">Basseterre Zone 01</SelectItem>
                    <SelectItem value="Basseterre Zone 02">Basseterre Zone 02</SelectItem>
                    <SelectItem value="Charlestown">Charlestown</SelectItem>
                    <SelectItem value="Sandy Point">Sandy Point</SelectItem>
                    <SelectItem value="Dieppe Bay">Dieppe Bay</SelectItem>
                    <SelectItem value="Cayon">Cayon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium">Mailing Address</h4>
              <div>
                <Label htmlFor="mailAddr1">Address Line 1</Label>
                <Input
                  id="mailAddr1"
                  value={formData.mailAddr1}
                  onChange={(e) => setFormData({...formData, mailAddr1: e.target.value})}
                  placeholder="Enter mailing address line 1"
                />
              </div>
              <div>
                <Label htmlFor="mailAddr2">Address Line 2</Label>
                <Input
                  id="mailAddr2"
                  value={formData.mailAddr2}
                  onChange={(e) => setFormData({...formData, mailAddr2: e.target.value})}
                  placeholder="Enter mailing address line 2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Enter phone number"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="primaryOccup">Primary Occupation *</Label>
            <Input
              id="primaryOccup"
              value={formData.primaryOccup}
              onChange={(e) => setFormData({...formData, primaryOccup: e.target.value})}
              placeholder="Enter primary occupation"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact & Beneficiary */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact & Beneficiary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactName">Emergency Contact Name *</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                placeholder="Enter emergency contact name"
                required
              />
            </div>
            <div>
              <Label htmlFor="contactRelation">Relationship *</Label>
              <Select value={formData.contactRelation} onValueChange={(value) => setFormData({...formData, contactRelation: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Parent">Parent</SelectItem>
                  <SelectItem value="Child">Child</SelectItem>
                  <SelectItem value="Sibling">Sibling</SelectItem>
                  <SelectItem value="Friend">Friend</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="contactAddr">Emergency Contact Address</Label>
            <Textarea
              id="contactAddr"
              value={formData.contactAddr}
              onChange={(e) => setFormData({...formData, contactAddr: e.target.value})}
              placeholder="Enter emergency contact address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="beneficiary">Beneficiary</Label>
              <Input
                id="beneficiary"
                value={formData.beneficiary}
                onChange={(e) => setFormData({...formData, beneficiary: e.target.value})}
                placeholder="Enter beneficiary name"
              />
            </div>
            <div>
              <Label htmlFor="benAddr">Beneficiary Address</Label>
              <Textarea
                id="benAddr"
                value={formData.benAddr}
                onChange={(e) => setFormData({...formData, benAddr: e.target.value})}
                placeholder="Enter beneficiary address"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Status */}
      <Card>
        <CardHeader>
          <CardTitle>Legal Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="workPermit">Work Permit Required</Label>
              <Select value={formData.workPermit} onValueChange={(value) => setFormData({...formData, workPermit: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="npf">NPF Member</Label>
              <Select value={formData.npf} onValueChange={(value) => setFormData({...formData, npf: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">
          Cancel
        </Button>
        <Button>
          Save Registration
        </Button>
      </div>
    </div>
  );
};
