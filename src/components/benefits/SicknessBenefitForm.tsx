
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const SicknessBenefitForm = () => {
  const [formData, setFormData] = useState({
    employeeId: "",
    fullName: "",
    dateOfBirth: "",
    illnessStartDate: "",
    expectedReturnDate: "",
    illnessType: "",
    diagnosisDetails: "",
    hospitalName: "",
    doctorName: "",
    contactPhone: "",
    address: "",
    bankAccount: "",
    emergencyContact: "",
    workRelated: "",
    previousSickLeave: "",
    currentMedication: "",
    additionalNotes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sickness benefit claim submitted:", formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sickness Benefit Claim Form</CardTitle>
        <CardDescription>
          Submit your application for sickness/injury benefit
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
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="illnessStartDate">Illness/Injury Start Date</Label>
              <Input
                id="illnessStartDate"
                type="date"
                value={formData.illnessStartDate}
                onChange={(e) => handleChange("illnessStartDate", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expectedReturnDate">Expected Return to Work Date</Label>
              <Input
                id="expectedReturnDate"
                type="date"
                value={formData.expectedReturnDate}
                onChange={(e) => handleChange("expectedReturnDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="illnessType">Type of Illness/Injury</Label>
              <Select onValueChange={(value) => handleChange("illnessType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select illness type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acute">Acute Illness</SelectItem>
                  <SelectItem value="chronic">Chronic Condition</SelectItem>
                  <SelectItem value="injury">Physical Injury</SelectItem>
                  <SelectItem value="mental">Mental Health</SelectItem>
                  <SelectItem value="surgery">Surgery/Recovery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosisDetails">Diagnosis Details</Label>
            <Textarea
              id="diagnosisDetails"
              value={formData.diagnosisDetails}
              onChange={(e) => handleChange("diagnosisDetails", e.target.value)}
              placeholder="Provide detailed diagnosis information"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hospitalName">Hospital/Medical Facility</Label>
              <Input
                id="hospitalName"
                value={formData.hospitalName}
                onChange={(e) => handleChange("hospitalName", e.target.value)}
                placeholder="Enter hospital name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctorName">Attending Doctor</Label>
              <Input
                id="doctorName"
                value={formData.doctorName}
                onChange={(e) => handleChange("doctorName", e.target.value)}
                placeholder="Enter doctor's name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input
                id="emergencyContact"
                value={formData.emergencyContact}
                onChange={(e) => handleChange("emergencyContact", e.target.value)}
                placeholder="Enter emergency contact"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Current Address</Label>
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
              <Label htmlFor="workRelated">Work-Related Illness/Injury?</Label>
              <Select onValueChange={(value) => handleChange("workRelated", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="partial">Partially</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="previousSickLeave">Previous Sick Leave History</Label>
            <Textarea
              id="previousSickLeave"
              value={formData.previousSickLeave}
              onChange={(e) => handleChange("previousSickLeave", e.target.value)}
              placeholder="Describe any previous sick leave taken in the last 12 months"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentMedication">Current Medication</Label>
            <Textarea
              id="currentMedication"
              value={formData.currentMedication}
              onChange={(e) => handleChange("currentMedication", e.target.value)}
              placeholder="List current medications and treatments"
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
