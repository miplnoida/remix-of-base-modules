
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const InjuryBenefitForm = () => {
  const [formData, setFormData] = useState({
    employeeId: "",
    fullName: "",
    dateOfInjury: "",
    injuryType: "",
    injuryDescription: "",
    workRelated: "",
    medicalProvider: "",
    treatmentCost: "",
    timeOffWork: "",
    bankAccount: "",
    contactPhone: "",
    witnessName: "",
    witnessContact: "",
    additionalNotes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Injury benefit claim submitted:", formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Injury Benefit Claim Form</CardTitle>
        <CardDescription>
          File a claim for injury benefits and medical assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => handleChange("employeeId", e.target.value)}
                placeholder="Enter employee ID"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfInjury">Date of Injury</Label>
              <Input
                id="dateOfInjury"
                type="date"
                value={formData.dateOfInjury}
                onChange={(e) => handleChange("dateOfInjury", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="injuryType">Type of Injury</Label>
              <Select onValueChange={(value) => handleChange("injuryType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select injury type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fracture">Fracture</SelectItem>
                  <SelectItem value="sprain">Sprain/Strain</SelectItem>
                  <SelectItem value="cut">Cut/Laceration</SelectItem>
                  <SelectItem value="burn">Burn</SelectItem>
                  <SelectItem value="back">Back Injury</SelectItem>
                  <SelectItem value="head">Head Injury</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="injuryDescription">Detailed Description of Injury</Label>
            <Textarea
              id="injuryDescription"
              value={formData.injuryDescription}
              onChange={(e) => handleChange("injuryDescription", e.target.value)}
              placeholder="Describe how the injury occurred and its severity"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workRelated">Is this a work-related injury?</Label>
            <Select onValueChange={(value) => handleChange("workRelated", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select if work-related" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes - Occurred at workplace</SelectItem>
                <SelectItem value="no">No - Not work-related</SelectItem>
                <SelectItem value="commuting">During commute to/from work</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="medicalProvider">Medical Provider/Hospital</Label>
              <Input
                id="medicalProvider"
                value={formData.medicalProvider}
                onChange={(e) => handleChange("medicalProvider", e.target.value)}
                placeholder="Enter medical provider name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatmentCost">Estimated Treatment Cost</Label>
              <Input
                id="treatmentCost"
                type="number"
                value={formData.treatmentCost}
                onChange={(e) => handleChange("treatmentCost", e.target.value)}
                placeholder="Enter treatment cost"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeOffWork">Expected Time Off Work (days)</Label>
              <Input
                id="timeOffWork"
                type="number"
                value={formData.timeOffWork}
                onChange={(e) => handleChange("timeOffWork", e.target.value)}
                placeholder="Enter days off work"
                required
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="witnessName">Witness Name (if any)</Label>
              <Input
                id="witnessName"
                value={formData.witnessName}
                onChange={(e) => handleChange("witnessName", e.target.value)}
                placeholder="Enter witness name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="witnessContact">Witness Contact</Label>
              <Input
                id="witnessContact"
                value={formData.witnessContact}
                onChange={(e) => handleChange("witnessContact", e.target.value)}
                placeholder="Enter witness contact"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => handleChange("additionalNotes", e.target.value)}
              placeholder="Any additional information about the injury"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline">
              Save Draft
            </Button>
            <Button type="submit">
              Submit Claim
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
