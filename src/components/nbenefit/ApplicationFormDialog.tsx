import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ApplicationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  benefitType: string;
  title: string;
}

export const ApplicationFormDialog = ({ open, onOpenChange, benefitType, title }: ApplicationFormDialogProps) => {
  const [formData, setFormData] = useState({
    ssn: "",
    firstName: "",
    lastName: "",
    dateOfBirth: undefined as Date | undefined,
    email: "",
    phone: "",
    address: "",
    employerId: "",
    applicationDate: new Date(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Application submitted:", { benefitType, ...formData });
    onOpenChange(false);
  };

  const renderBenefitSpecificFields = () => {
    switch (benefitType) {
      case "SICKNESS":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="lastDayWorked">Last Day Worked</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Select date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedReturn">Expected Return Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Select date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="illness">Nature of Illness/Injury</Label>
              <Textarea id="illness" placeholder="Describe the illness or injury..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctor">Attending Physician</Label>
              <Input id="doctor" placeholder="Doctor's name" />
            </div>
          </>
        );

      case "MATERNITY":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="expectedDelivery">Expected Delivery Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Select date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pregnancyWeeks">Weeks of Pregnancy</Label>
              <Input id="pregnancyWeeks" type="number" placeholder="Number of weeks" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obstetrician">Obstetrician/Doctor</Label>
              <Input id="obstetrician" placeholder="Doctor's name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefitType">Benefit Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowance">Maternity Allowance</SelectItem>
                  <SelectItem value="grant">Maternity Grant</SelectItem>
                  <SelectItem value="both">Both Allowance & Grant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "EMPLOYMENT_INJURY":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="injuryDate">Date of Injury/Accident</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Select date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="injuryLocation">Location of Incident</Label>
              <Input id="injuryLocation" placeholder="Where did the injury occur?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="injuryDescription">Description of Injury</Label>
              <Textarea id="injuryDescription" placeholder="Describe the accident and injury..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="injuryType">Injury Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary">Temporary Disablement</SelectItem>
                  <SelectItem value="permanent">Permanent Disablement</SelectItem>
                  <SelectItem value="medical">Medical Expenses</SelectItem>
                  <SelectItem value="death">Death Benefit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="witnessNames">Witness Names (if any)</Label>
              <Input id="witnessNames" placeholder="Names of witnesses" />
            </div>
          </>
        );

      case "FUNERAL_GRANT":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="deceasedName">Name of Deceased</Label>
              <Input id="deceasedName" placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deceasedSSN">Deceased SSN</Label>
              <Input id="deceasedSSN" placeholder="XXX-XX-XXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deathDate">Date of Death</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Select date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship to Deceased</Label>
              <Select>
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
            <div className="space-y-2">
              <Label htmlFor="funeralCost">Estimated Funeral Cost (XCD)</Label>
              <Input id="funeralCost" type="number" placeholder="0.00" />
            </div>
          </>
        );

      case "AGE_BENEFIT":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="retirementDate">Expected Retirement Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Select date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pensionType">Pension Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pension">Age Pension</SelectItem>
                  <SelectItem value="grant">Age Grant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contributionYears">Years of Contribution</Label>
              <Input id="contributionYears" type="number" placeholder="Number of years" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccount">Bank Account Number</Label>
              <Input id="bankAccount" placeholder="Account number for payments" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" placeholder="Name of bank" />
            </div>
          </>
        );

      case "INVALIDITY":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="disabilityDate">Date Disability Commenced</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Select date
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="medicalCondition">Medical Condition</Label>
              <Textarea id="medicalCondition" placeholder="Describe the condition..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatingDoctor">Treating Physician</Label>
              <Input id="treatingDoctor" placeholder="Doctor's name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impairmentLevel">Level of Impairment (%)</Label>
              <Input id="impairmentLevel" type="number" min="0" max="100" placeholder="0-100%" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workStatus">Current Work Status</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unable">Unable to Work</SelectItem>
                  <SelectItem value="limited">Limited Work Capacity</SelectItem>
                  <SelectItem value="modified">Modified Duties</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Applicant Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ssn">Social Security Number *</Label>
                <Input
                  id="ssn"
                  value={formData.ssn}
                  onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                  placeholder="XXX-XX-XXXX"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left", !formData.dateOfBirth && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dateOfBirth ? format(formData.dateOfBirth, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.dateOfBirth}
                      onSelect={(date) => setFormData({ ...formData, dateOfBirth: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(869) XXX-XXXX"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Residential Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employerId">Employer (if applicable)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select employer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOV001">Government of St. Kitts & Nevis</SelectItem>
                  <SelectItem value="RBC001">Royal Bank of Canada</SelectItem>
                  <SelectItem value="SELF">Self-Employed</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Benefit-Specific Information</h3>
            {renderBenefitSpecificFields()}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Declaration</h3>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                I declare that the information provided in this application is true, complete, and accurate to the best of my knowledge.
                I understand that providing false information may result in denial of benefits and/or legal action.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Application</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
