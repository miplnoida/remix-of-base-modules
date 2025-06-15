
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const NonContribPensionForm = () => {
  const [formData, setFormData] = useState({
    applicantId: "",
    fullName: "",
    dateOfBirth: "",
    maritalStatus: "",
    householdIncome: "",
    dependents: "",
    bankAccount: "",
    contactPhone: "",
    address: "",
    disabilityStatus: "",
    additionalNotes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Non-contributory pension claim submitted:", formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Non-Contributory Pension Application</CardTitle>
        <CardDescription>
          Apply for assistance non-contributory pension
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="applicantId">Applicant ID/Passport</Label>
              <Input
                id="applicantId"
                value={formData.applicantId}
                onChange={(e) => handleChange("applicantId", e.target.value)}
                placeholder="Enter ID or passport number"
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
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select onValueChange={(value) => handleChange("maritalStatus", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select marital status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="householdIncome">Monthly Household Income</Label>
              <Input
                id="householdIncome"
                type="number"
                value={formData.householdIncome}
                onChange={(e) => handleChange("householdIncome", e.target.value)}
                placeholder="Enter household income"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dependents">Number of Dependents</Label>
              <Input
                id="dependents"
                type="number"
                value={formData.dependents}
                onChange={(e) => handleChange("dependents", e.target.value)}
                placeholder="Enter number of dependents"
                required
              />
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="disabilityStatus">Disability Status (if applicable)</Label>
            <Select onValueChange={(value) => handleChange("disabilityStatus", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select disability status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Disability</SelectItem>
                <SelectItem value="partial">Partial Disability</SelectItem>
                <SelectItem value="total">Total Disability</SelectItem>
                <SelectItem value="visual">Visual Impairment</SelectItem>
                <SelectItem value="hearing">Hearing Impairment</SelectItem>
                <SelectItem value="mobility">Mobility Impairment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Information</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes}
              onChange={(e) => handleChange("additionalNotes", e.target.value)}
              placeholder="Any additional information about your application"
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
