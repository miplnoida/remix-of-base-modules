
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const FuneralGrantForm = () => {
  const [formData, setFormData] = useState({
    deceasedEmployeeId: "",
    deceasedFullName: "",
    dateOfDeath: "",
    causeOfDeath: "",
    claimantName: "",
    relationshipToDeceased: "",
    claimantId: "",
    contactPhone: "",
    address: "",
    bankAccount: "",
    deathCertificateNumber: "",
    hospitalName: "",
    funeralHomeDetails: "",
    estimatedCosts: "",
    additionalNotes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Funeral grant claim submitted:", formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funeral Grant Claim Form</CardTitle>
        <CardDescription>
          Submit your application for funeral grant assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deceasedEmployeeId">Deceased Employee ID</Label>
              <Input
                id="deceasedEmployeeId"
                value={formData.deceasedEmployeeId}
                onChange={(e) => handleChange("deceasedEmployeeId", e.target.value)}
                placeholder="Enter deceased employee ID"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deceasedFullName">Deceased Full Name</Label>
              <Input
                id="deceasedFullName"
                value={formData.deceasedFullName}
                onChange={(e) => handleChange("deceasedFullName", e.target.value)}
                placeholder="Enter deceased full name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfDeath">Date of Death</Label>
              <Input
                id="dateOfDeath"
                type="date"
                value={formData.dateOfDeath}
                onChange={(e) => handleChange("dateOfDeath", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="causeOfDeath">Cause of Death</Label>
              <Input
                id="causeOfDeath"
                value={formData.causeOfDeath}
                onChange={(e) => handleChange("causeOfDeath", e.target.value)}
                placeholder="Enter cause of death"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="claimantName">Claimant Name</Label>
              <Input
                id="claimantName"
                value={formData.claimantName}
                onChange={(e) => handleChange("claimantName", e.target.value)}
                placeholder="Enter claimant name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationshipToDeceased">Relationship to Deceased</Label>
              <Select onValueChange={(value) => handleChange("relationshipToDeceased", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="claimantId">Claimant ID Number</Label>
              <Input
                id="claimantId"
                value={formData.claimantId}
                onChange={(e) => handleChange("claimantId", e.target.value)}
                placeholder="Enter ID number"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleChange("contactPhone", e.target.value)}
                placeholder="Enter phone number"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Claimant Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Enter complete address"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Bank Account Number</Label>
              <Input
                id="bankAccount"
                value={formData.bankAccount}
                onChange={(e) => handleChange("bankAccount", e.target.value)}
                placeholder="Enter bank account"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deathCertificateNumber">Death Certificate Number</Label>
              <Input
                id="deathCertificateNumber"
                value={formData.deathCertificateNumber}
                onChange={(e) => handleChange("deathCertificateNumber", e.target.value)}
                placeholder="Enter certificate number"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hospitalName">Hospital/Medical Facility</Label>
              <Input
                id="hospitalName"
                value={formData.hospitalName}
                onChange={(e) => handleChange("hospitalName", e.target.value)}
                placeholder="Enter hospital name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCosts">Estimated Funeral Costs</Label>
              <Input
                id="estimatedCosts"
                type="number"
                value={formData.estimatedCosts}
                onChange={(e) => handleChange("estimatedCosts", e.target.value)}
                placeholder="Enter estimated costs"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="funeralHomeDetails">Funeral Home Details</Label>
            <Textarea
              id="funeralHomeDetails"
              value={formData.funeralHomeDetails}
              onChange={(e) => handleChange("funeralHomeDetails", e.target.value)}
              placeholder="Enter funeral home name and contact details"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => handleChange("additionalNotes", e.target.value)}
              placeholder="Any additional information"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline">
              Save Draft
            </Button>
            <Button type="submit">
              Submit Application
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
