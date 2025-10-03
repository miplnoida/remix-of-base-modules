import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useLegalCases } from "@/contexts/LegalCaseContext";

interface FormData {
  // Step 1: Basics
  title: string;
  caseType: string;
  source: string;
  priority: string;
  confidential: boolean;
  
  // Step 2: Parties
  parties: Array<{ role: string; name: string; contact: string }>;
  
  // Step 3: Subject
  summary: string;
  relief_sought: string;
  
  // Step 4: Attachments (mock)
  attachments: string[];
  
  // Auto-generated
  stage: string;
  status: string;
}

const STEPS = [
  { id: 1, name: "Basics" },
  { id: 2, name: "Parties" },
  { id: 3, name: "Subject" },
  { id: 4, name: "Attachments" },
  { id: 5, name: "Review" }
];

export default function CaseIntakeWizard() {
  const navigate = useNavigate();
  const { addCase } = useLegalCases();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    title: "",
    caseType: "",
    source: "Internal",
    priority: "Medium",
    confidential: false,
    parties: [{ role: "Applicant", name: "", contact: "" }],
    summary: "",
    relief_sought: "",
    attachments: [],
    stage: "Intake",
    status: "Draft"
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('wizard-title')?.focus();
  }, [currentStep]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = "Case title is required";
      if (!formData.caseType) newErrors.caseType = "Case type is required";
    }

    if (step === 2) {
      const validParties = formData.parties.filter(p => p.name.trim());
      if (validParties.length === 0) {
        newErrors.parties = "At least one party is required";
      }
    }

    if (step === 3) {
      if (!formData.summary.trim()) newErrors.summary = "Summary is required";
      if (formData.summary.trim().length < 20) newErrors.summary = "Summary must be at least 20 characters";
      if (!formData.relief_sought.trim()) newErrors.relief_sought = "Relief sought is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleAddParty = () => {
    setFormData(prev => ({
      ...prev,
      parties: [...prev.parties, { role: "Party", name: "", contact: "" }]
    }));
  };

  const handleRemoveParty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index)
    }));
  };

  const handlePartyChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.map((party, i) => 
        i === index ? { ...party, [field]: value } : party
      )
    }));
  };

  const handleSubmit = (isDraft: boolean) => {
    if (!isDraft && !validateStep(3)) {
      setCurrentStep(3);
      return;
    }

    const caseId = addCase({
      number: `SSB-2025-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`,
      title: formData.title,
      type: formData.caseType,
      status: isDraft ? 'Draft' : 'Filed',
      stage: formData.stage,
      priority: formData.priority,
      parties: formData.parties.filter(p => p.name.trim()).map(p => p.name),
      assignee: 'Unassigned',
      filed_at: new Date().toISOString(),
      next_event_at: null,
      summary: formData.summary,
      relief_sought: formData.relief_sought,
      flags: [],
      activities: [],
      hearings: []
    });

    toast.success(isDraft ? "Case saved as draft" : "Case submitted successfully");
    navigate(`/legal/cases/${caseId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Button 
          onClick={() => navigate('/legal/cases')} 
          variant="ghost" 
          size="sm"
          className="mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>

        <h1 id="wizard-title" className="text-3xl font-bold mb-2" tabIndex={-1}>
          New Case Intake
        </h1>
        <p className="text-muted-foreground">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${currentStep > step.id ? 'bg-green-600 text-white' : 
                  currentStep === step.id ? 'bg-primary text-primary-foreground' : 
                  'bg-muted text-muted-foreground'}
              `}>
                {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
              </div>
              <span className="text-xs mt-1 hidden sm:block">{step.name}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 ${currentStep > step.id ? 'bg-green-600' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Basics */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Case Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Brief descriptive title"
                  className="mt-1"
                />
                {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
              </div>

              <div>
                <Label htmlFor="caseType">Case Type *</Label>
                <Select value={formData.caseType} onValueChange={(v) => handleChange('caseType', v)}>
                  <SelectTrigger id="caseType" className="mt-1">
                    <SelectValue placeholder="Select case type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Prosecution">Prosecution</SelectItem>
                    <SelectItem value="Recovery">Recovery</SelectItem>
                    <SelectItem value="Appeal">Appeal</SelectItem>
                    <SelectItem value="Enforcement">Enforcement</SelectItem>
                  </SelectContent>
                </Select>
                {errors.caseType && <p className="text-sm text-red-600 mt-1">{errors.caseType}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select value={formData.source} onValueChange={(v) => handleChange('source', v)}>
                    <SelectTrigger id="source" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="Internal">Internal</SelectItem>
                      <SelectItem value="External">External</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                    <SelectTrigger id="priority" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="confidential"
                  checked={formData.confidential}
                  onCheckedChange={(checked) => handleChange('confidential', checked)}
                />
                <Label htmlFor="confidential" className="cursor-pointer">
                  Mark as confidential
                </Label>
              </div>
            </div>
          )}

          {/* Step 2: Parties */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {formData.parties.map((party, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Party {index + 1}</h4>
                    {formData.parties.length > 1 && (
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveParty(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`role-${index}`}>Role</Label>
                      <Select 
                        value={party.role} 
                        onValueChange={(v) => handlePartyChange(index, 'role', v)}
                      >
                        <SelectTrigger id={`role-${index}`} className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="Applicant">Applicant</SelectItem>
                          <SelectItem value="Respondent">Respondent</SelectItem>
                          <SelectItem value="Third Party">Third Party</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor={`name-${index}`}>Name *</Label>
                      <Input
                        id={`name-${index}`}
                        value={party.name}
                        onChange={(e) => handlePartyChange(index, 'name', e.target.value)}
                        placeholder="Full name or entity"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`contact-${index}`}>Contact</Label>
                      <Input
                        id={`contact-${index}`}
                        value={party.contact}
                        onChange={(e) => handlePartyChange(index, 'contact', e.target.value)}
                        placeholder="Email or phone"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {errors.parties && <p className="text-sm text-red-600">{errors.parties}</p>}

              <Button type="button" variant="outline" onClick={handleAddParty}>
                Add Another Party
              </Button>
            </div>
          )}

          {/* Step 3: Subject */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="summary">Case Summary *</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => handleChange('summary', e.target.value)}
                  placeholder="Provide a detailed summary of the case (minimum 20 characters)"
                  rows={6}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.summary.length} characters
                </p>
                {errors.summary && <p className="text-sm text-red-600 mt-1">{errors.summary}</p>}
              </div>

              <div>
                <Label htmlFor="relief">Relief Sought *</Label>
                <Textarea
                  id="relief"
                  value={formData.relief_sought}
                  onChange={(e) => handleChange('relief_sought', e.target.value)}
                  placeholder="Describe the relief or remedy being sought"
                  rows={4}
                  className="mt-1"
                />
                {errors.relief_sought && <p className="text-sm text-red-600 mt-1">{errors.relief_sought}</p>}
              </div>
            </div>
          )}

          {/* Step 4: Attachments */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-muted-foreground mb-2">Drag and drop files here</p>
                <p className="text-xs text-muted-foreground mb-4">or</p>
                <Button variant="outline" size="sm">Browse Files</Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Preview mode: File uploads are simulated
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Case Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div><dt className="font-medium">Title:</dt><dd className="text-muted-foreground">{formData.title}</dd></div>
                    <div><dt className="font-medium">Type:</dt><dd className="text-muted-foreground">{formData.caseType}</dd></div>
                    <div><dt className="font-medium">Priority:</dt><dd className="text-muted-foreground">{formData.priority}</dd></div>
                    <div><dt className="font-medium">Confidential:</dt><dd className="text-muted-foreground">{formData.confidential ? 'Yes' : 'No'}</dd></div>
                  </dl>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Parties</h4>
                  <ul className="space-y-1 text-sm">
                    {formData.parties.filter(p => p.name.trim()).map((party, index) => (
                      <li key={index} className="text-muted-foreground">
                        {party.name} ({party.role})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Summary</h4>
                <p className="text-sm text-muted-foreground">{formData.summary}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Relief Sought</h4>
                <p className="text-sm text-muted-foreground">{formData.relief_sought}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex gap-2">
          {currentStep === STEPS.length ? (
            <>
              <Button variant="outline" onClick={() => handleSubmit(true)}>
                Save Draft
              </Button>
              <Button onClick={() => handleSubmit(false)}>
                Submit for Review
              </Button>
            </>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
