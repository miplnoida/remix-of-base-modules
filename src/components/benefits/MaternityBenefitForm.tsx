
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const MaternityBenefitForm = () => {
  const [formData, setFormData] = useState({
    employeeId: "",
    fullName: "",
    dateOfBirth: "",
    expectedDueDate: "",
    actualDeliveryDate: "",
    pregnancyType: "",
    numberOfBabies: "",
    hospitalName: "",
    doctorName: "",
    contactPhone: "",
    address: "",
    bankAccount: "",
    spouseName: "",
    emergencyContact: "",
    medicalComplicationns: "",
    previousPregnancies: "",
    additionalNotes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Maternity benefit claim submitted:", formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maternity Benefit Claim Form</CardTitle>
        <CardDescription>
          Submit your application for maternity benefit assistance
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
              <Label htmlFor="expectedDueDate">Expected Due Date</Label>
              <Input
                id="expectedDueDate"
                type="date"
                value={formData.expectedDueDate}
                onChange={(e) => handleChange("expectedDueDate", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actualDeliveryDate">Actual Delivery Date (if delivered)</Label>
              <Input
                id="actualDeliveryDate"
                type="date"
                value={formData.actualDeliveryDate}
                onChange={(e) => handleChange("actualDeliveryDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pregnancyType">Pregnancy Type</Label>
              <Select onValueChange={(value) => handleChange("pregnancyType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pregnancy type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Birth</SelectItem>
                  <SelectItem value="twin">Twin Birth</SelectItem>
                  <SelectItem value="multiple">Multiple Birth</SelectItem>
                  <SelectItem value="miscarriage">Miscarriage</SelectItem>
                  <SelectItem value="stillbirth">Stillbirth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfBabies">Number of Babies</Label>
              <Input
                id="numberOfBabies"
                type="number"
                value={formData.numberOfBabies}
                onChange={(e) => handleChange("numberOfBabies", e.target.value)}
                placeholder="Enter number of babies"
                min="1"
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="spouseName">Spouse Name</Label>
              <Input
                id="spouseName"
                value={formData.spouseName}
                onChange={(e) => handleChange("spouseName", e.target.value)}
                placeholder="Enter spouse name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="previousPregnancies">Previous Pregnancies</Label>
              <Input
                id="previousPregnancies"
                type="number"
                value={formData.previousPregnancies}
                onChange={(e) => handleChange("previousPregnancies", e.target.value)}
                placeholder="Number of previous pregnancies"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicalComplicationns">Medical Complications</Label>
            <Textarea
              id="medicalComplicationns"
              value={formData.medicalComplicationns}
              onChange={(e) => handleChange("medicalComplicationns", e.target.value)}
              placeholder="Describe any medical complications"
              rows={3}
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
