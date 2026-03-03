import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Send,
  User,
  Stethoscope,
  Building,
  FileText,
  Upload,
  Plus,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

interface PracticeLocation {
  id: string;
  facilityName: string;
  address: string;
  island: string;
  phone: string;
  isPrimary: boolean;
}

export default function NewManualApplication() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    nationalId: '',
    email: '',
    phone: '',
    address: '',
    localRegistrationNumber: '',
    registrationAuthority: '',
    speciality: '',
    licenseExpiryDate: '',
    otherJurisdictions: '',
    yearsOfExperience: '',
    canStartSicknessClaims: true,
    canStartInjuryClaims: false,
    canStartMaternityClaims: false,
  });

  const [practiceLocations, setPracticeLocations] = useState<PracticeLocation[]>([
    { id: '1', facilityName: '', address: '', island: '', phone: '', isPrimary: true }
  ]);

  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string }[]>([]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (index: number, field: string, value: string | boolean) => {
    setPracticeLocations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLocation = () => {
    setPracticeLocations(prev => [
      ...prev,
      { id: Date.now().toString(), facilityName: '', address: '', island: '', phone: '', isPrimary: false }
    ]);
  };

  const removeLocation = (index: number) => {
    if (practiceLocations.length > 1) {
      setPracticeLocations(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(f => ({ name: f.name, type: 'Other' }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleSaveDraft = () => {
    toast.success('Application saved as draft');
    navigate('/medical/applications');
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Application submitted successfully');
    setIsSubmitting(false);
    navigate('/medical/applications');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/medical/applications')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">New Manual Application</h1>
            <p className="text-muted-foreground">Enter doctor registration details from paper form</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Select value={formData.title} onValueChange={(v) => handleInputChange('title', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="nationality">Nationality *</Label>
                <Select value={formData.nationality} onValueChange={(v) => handleInputChange('nationality', v)}>
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
              <Label htmlFor="nationalId">National ID Number *</Label>
              <Input
                id="nationalId"
                value={formData.nationalId}
                onChange={(e) => handleInputChange('nationalId', e.target.value)}
                placeholder="e.g., KN-1980-12345"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="doctor@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1-869-555-0000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Full address"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Professional & Licensing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="localRegistrationNumber">Registration Number *</Label>
                <Input
                  id="localRegistrationNumber"
                  value={formData.localRegistrationNumber}
                  onChange={(e) => handleInputChange('localRegistrationNumber', e.target.value)}
                  placeholder="MED-XXXX-XXXX"
                />
              </div>
              <div>
                <Label htmlFor="registrationAuthority">Registration Authority *</Label>
                <Select value={formData.registrationAuthority} onValueChange={(v) => handleInputChange('registrationAuthority', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select authority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="St Kitts Medical Board">St Kitts Medical Board</SelectItem>
                    <SelectItem value="Nevis Medical Council">Nevis Medical Council</SelectItem>
                    <SelectItem value="Foreign">Foreign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="speciality">Speciality *</Label>
                <Select value={formData.speciality} onValueChange={(v) => handleInputChange('speciality', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select speciality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General Practice">General Practice</SelectItem>
                    <SelectItem value="Internal Medicine">Internal Medicine</SelectItem>
                    <SelectItem value="Obstetrics & Gynecology">Obstetrics & Gynecology</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Surgery">Surgery</SelectItem>
                    <SelectItem value="Emergency Medicine">Emergency Medicine</SelectItem>
                    <SelectItem value="Occupational Medicine">Occupational Medicine</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  value={formData.yearsOfExperience}
                  onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="licenseExpiryDate">License Expiry Date *</Label>
              <Input
                id="licenseExpiryDate"
                type="date"
                value={formData.licenseExpiryDate}
                onChange={(e) => handleInputChange('licenseExpiryDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="otherJurisdictions">Other Jurisdictions (if any)</Label>
              <Input
                id="otherJurisdictions"
                value={formData.otherJurisdictions}
                onChange={(e) => handleInputChange('otherJurisdictions', e.target.value)}
                placeholder="List other countries/regions where registered"
              />
            </div>
          </CardContent>
        </Card>

        {/* Practice Locations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" />
              Practice Locations
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addLocation}>
              <Plus className="h-4 w-4 mr-1" />
              Add Location
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {practiceLocations.map((location, index) => (
              <div key={location.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`primary-${index}`}
                      checked={location.isPrimary}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPracticeLocations(prev => prev.map((loc, i) => ({
                            ...loc,
                            isPrimary: i === index
                          })));
                        }
                      }}
                    />
                    <Label htmlFor={`primary-${index}`} className="text-sm">Primary Location</Label>
                  </div>
                  {practiceLocations.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeLocation(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div>
                  <Label>Facility Name *</Label>
                  <Input
                    value={location.facilityName}
                    onChange={(e) => handleLocationChange(index, 'facilityName', e.target.value)}
                    placeholder="Clinic/Hospital name"
                  />
                </div>

                <div>
                  <Label>Address *</Label>
                  <Input
                    value={location.address}
                    onChange={(e) => handleLocationChange(index, 'address', e.target.value)}
                    placeholder="Full address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Island *</Label>
                    <Select
                      value={location.island}
                      onValueChange={(v) => handleLocationChange(index, 'island', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select island" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="St Kitts">St Kitts</SelectItem>
                        <SelectItem value="Nevis">Nevis</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input
                      value={location.phone}
                      onChange={(e) => handleLocationChange(index, 'phone', e.target.value)}
                      placeholder="+1-869-555-0000"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Benefit Permissions & Documents */}
        <div className="space-y-6">
          {/* Benefit Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Benefit Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sickness"
                  checked={formData.canStartSicknessClaims}
                  onCheckedChange={(checked) => handleInputChange('canStartSicknessClaims', !!checked)}
                />
                <Label htmlFor="sickness">Can initiate Sickness Benefit referrals</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="injury"
                  checked={formData.canStartInjuryClaims}
                  onCheckedChange={(checked) => handleInputChange('canStartInjuryClaims', !!checked)}
                />
                <Label htmlFor="injury">Can initiate Employment Injury referrals</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="maternity"
                  checked={formData.canStartMaternityClaims}
                  onCheckedChange={(checked) => handleInputChange('canStartMaternityClaims', !!checked)}
                />
                <Label htmlFor="maternity">Can initiate Maternity Benefit referrals</Label>
              </div>
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Uploads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload scanned documents (ID, License, Certificates)
                </p>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
