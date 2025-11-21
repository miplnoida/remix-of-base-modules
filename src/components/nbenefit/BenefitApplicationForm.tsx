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
import { peopleAdapter, type Person } from "@/adapters/peopleAdapter";
import { toast } from "sonner";

interface BenefitApplicationFormProps {
  benefitType: "SICKNESS" | "MATERNITY" | "EMPLOYMENT_INJURY" | "FUNERAL_GRANT" | "AGE_BENEFIT" | "INVALIDITY";
  onClose: () => void;
}

export const BenefitApplicationForm = ({ benefitType, onClose }: BenefitApplicationFormProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [insuredPerson, setInsuredPerson] = useState<Person | null>(null);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter an SSN or name to search");
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await peopleAdapter.search(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        toast.error("No insured person found");
      }
    } catch (error) {
      toast.error("Error searching for insured person");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPerson = (person: Person) => {
    setInsuredPerson(person);
    setSearchResults([]);
    setSearchQuery("");
    toast.success(`Selected ${person.name}`);
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
          {/* Step 1: Search Insured Person by SSN or Name */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Step 1: Search Insured Person</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">SSN or Name</Label>
                  <Input
                    id="search"
                    placeholder="Enter SSN or Name (e.g., 123-45-6789 or John Williams)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={isSearching}>
                    <Search className="h-4 w-4 mr-2" />
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && !insuredPerson && (
                <div className="border rounded-lg divide-y">
                  <div className="p-3 bg-muted/50 font-medium text-sm">
                    Found {searchResults.length} result{searchResults.length > 1 ? 's' : ''} - Click to select
                  </div>
                  {searchResults.map((person) => (
                    <div
                      key={person.ssn}
                      className="p-4 hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleSelectPerson(person)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{person.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">SSN: {person.ssn}</div>
                          <div className="text-sm text-muted-foreground">DOB: {person.dob}</div>
                        </div>
                        <Badge variant={person.status === "Active" ? "default" : "secondary"}>
                          {person.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                    <p className="font-semibold">{insuredPerson.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">SSN</Label>
                    <p className="font-semibold">{insuredPerson.ssn}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                    <p className="font-semibold">{insuredPerson.dob}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <p className="font-semibold">{insuredPerson.contact.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-semibold">{insuredPerson.contact.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <p className="font-semibold">{insuredPerson.status}</p>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInsuredPerson(null);
                      setSearchQuery("");
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Selection
                  </Button>
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
