import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, User, FileText, Calendar, DollarSign, ArrowRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BenefitApplicationFormProps {
  benefitType: "SICKNESS" | "MATERNITY" | "EMPLOYMENT_INJURY" | "FUNERAL_GRANT" | "AGE_BENEFIT" | "INVALIDITY";
  onClose: () => void;
}

export const BenefitApplicationForm = ({ benefitType, onClose }: BenefitApplicationFormProps) => {
  const [ssn, setSsn] = useState("");
  const [insuredPerson, setInsuredPerson] = useState<any>(null);
  const [formData, setFormData] = useState({
    claimDate: "",
    startDate: "",
    endDate: "",
    medicalCertificate: "",
    employerName: "",
    accidentDate: "",
    accidentDescription: "",
    expectedDeliveryDate: "",
    deceasedName: "",
    deathDate: "",
    relationship: "",
    notes: "",
  });

  const handleSearchSSN = () => {
    // Mock data - in real implementation, this would call an API
    if (ssn) {
      setInsuredPerson({
        ssn: ssn,
        fullName: "John Michael Pemberton",
        dateOfBirth: "1985-05-15",
        address: "123 Main Street, Basseterre, St. Kitts",
        phone: "+1-869-465-1234",
        email: "john.pemberton@example.com",
        contributionWeeks: 156,
        lastEmployer: "Caribbean Hotel & Resort Ltd.",
        status: "Active"
      });
    }
  };

  const getBenefitTitle = () => {
    switch (benefitType) {
      case "SICKNESS": return "Sickness Benefit Application";
      case "MATERNITY": return "Maternity Benefit Application";
      case "EMPLOYMENT_INJURY": return "Employment Injury Benefit Application";
      case "FUNERAL_GRANT": return "Funeral Grant Application";
      case "AGE_BENEFIT": return "Age Pension/Grant Application";
      case "INVALIDITY": return "Invalidity Benefit Application";
      default: return "Benefit Application";
    }
  };

  const handleSubmit = () => {
    // Submit to Finance → Accounts Payable workflow
    console.log("Submitting application with payment to Finance → Accounts Payable");
    console.log({ benefitType, insuredPerson, formData });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">{getBenefitTitle()}</h2>
            <p className="text-sm text-muted-foreground">Complete the form below to process benefit application</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Step 1: Search Insured Person by SSN */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Step 1: Search Insured Person</h3>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="ssn">Social Security Number (SSN)</Label>
                <Input
                  id="ssn"
                  placeholder="Enter SSN (e.g., 123456789)"
                  value={ssn}
                  onChange={(e) => setSsn(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearchSSN}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </Card>

          {/* Step 2: Insured Person Details (shown after search) */}
          {insuredPerson && (
            <>
              <Card className="p-6 border-2 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Insured Person Details</h3>
                  <Badge variant="default" className="ml-auto">{insuredPerson.status}</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <p className="font-semibold">{insuredPerson.fullName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">SSN</Label>
                    <p className="font-semibold">{insuredPerson.ssn}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                    <p className="font-semibold">{insuredPerson.dateOfBirth}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Contribution Weeks</Label>
                    <p className="font-semibold">{insuredPerson.contributionWeeks} weeks</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="font-semibold">{insuredPerson.phone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Employer</Label>
                    <p className="font-semibold">{insuredPerson.lastEmployer}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <p className="font-semibold">{insuredPerson.address}</p>
                  </div>
                </div>
              </Card>

              {/* Step 3: Benefit-Specific Information */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Step 2: Benefit Application Details</h3>
                </div>

                <div className="space-y-4">
                  {/* Common Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="claimDate">Claim Date</Label>
                      <Input
                        id="claimDate"
                        type="date"
                        value={formData.claimDate}
                        onChange={(e) => setFormData({ ...formData, claimDate: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Sickness Benefit Specific */}
                  {benefitType === "SICKNESS" && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Sickness Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Incapacity Start Date</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">Expected Return Date</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="medicalCertificate">Medical Certificate Number</Label>
                          <Input
                            id="medicalCertificate"
                            placeholder="Enter medical certificate reference"
                            value={formData.medicalCertificate}
                            onChange={(e) => setFormData({ ...formData, medicalCertificate: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Maternity Benefit Specific */}
                  {benefitType === "MATERNITY" && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Maternity Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                          <Input
                            id="expectedDeliveryDate"
                            type="date"
                            value={formData.expectedDeliveryDate}
                            onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="medicalCertificate">Medical Certificate Number</Label>
                          <Input
                            id="medicalCertificate"
                            placeholder="Enter medical certificate reference"
                            value={formData.medicalCertificate}
                            onChange={(e) => setFormData({ ...formData, medicalCertificate: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employment Injury Specific */}
                  {benefitType === "EMPLOYMENT_INJURY" && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Employment Injury Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="accidentDate">Accident Date</Label>
                          <Input
                            id="accidentDate"
                            type="date"
                            value={formData.accidentDate}
                            onChange={(e) => setFormData({ ...formData, accidentDate: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="employerName">Employer at Time of Accident</Label>
                          <Input
                            id="employerName"
                            placeholder="Enter employer name"
                            value={formData.employerName}
                            onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="accidentDescription">Accident Description</Label>
                          <Textarea
                            id="accidentDescription"
                            placeholder="Describe how the accident occurred"
                            value={formData.accidentDescription}
                            onChange={(e) => setFormData({ ...formData, accidentDescription: e.target.value })}
                            className="mt-1"
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Funeral Grant Specific */}
                  {benefitType === "FUNERAL_GRANT" && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm">Funeral Grant Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="deceasedName">Deceased Name</Label>
                          <Input
                            id="deceasedName"
                            placeholder="Full name of deceased"
                            value={formData.deceasedName}
                            onChange={(e) => setFormData({ ...formData, deceasedName: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="deathDate">Date of Death</Label>
                          <Input
                            id="deathDate"
                            type="date"
                            value={formData.deathDate}
                            onChange={(e) => setFormData({ ...formData, deathDate: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="relationship">Relationship to Insured</Label>
                          <Select
                            value={formData.relationship}
                            onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="self">Self (Insured Person)</SelectItem>
                              <SelectItem value="spouse">Spouse</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter any additional information or notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              </Card>

              {/* Step 4: Payment Information */}
              <Card className="p-6 border-2 border-green-500/20 bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Step 3: Payment Processing</h3>
                </div>
                
                <div className="p-4 bg-background rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Payment Route:</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Finance</span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-semibold">Accounts Payable</span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-semibold text-primary">Benefit Payment</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upon approval, payment will be processed through Finance → Accounts Payable → Benefit Payment workflow
                  </p>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  Submit Application
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {!insuredPerson && (
            <Card className="p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Enter an SSN and click Search to begin the application process
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
