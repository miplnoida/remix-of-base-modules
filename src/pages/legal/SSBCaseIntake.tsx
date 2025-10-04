import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { ArrowLeft, ArrowRight, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { useLegalCases } from "@/contexts/LegalCaseContext";

const CASE_TYPES = ['Non-Payment', 'Non-Compliance', 'Fraud', 'Appeal', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function SSBCaseIntake() {
  const navigate = useNavigate();
  const { addCase } = useLegalCases();
  const [currentStep, setCurrentStep] = useState(0);
  
  const [formData, setFormData] = useState({
    type: '',
    priority: 'Medium',
    title: '',
    summary: '',
    relief_sought: '',
    parties: [{ role: 'Applicant', name: 'Social Security Board' }],
    attachments: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors; });
    }
  };

  const addParty = () => {
    setFormData(prev => ({
      ...prev,
      parties: [...prev.parties, { role: formData.parties.length === 0 ? 'Applicant' : 'Respondent', name: '' }]
    }));
  };

  const updateParty = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  const removeParty = (index: number) => {
    if (index === 0) return; // Don't remove SSB
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      if (!formData.type) newErrors.type = 'Case type is required';
      if (!formData.title || formData.title.length < 10) newErrors.title = 'Title must be at least 10 characters';
    }
    
    if (step === 1) {
      if (formData.parties.length < 2) newErrors.parties = 'At least one respondent is required';
      formData.parties.forEach((p, i) => {
        if (!p.name && i > 0) newErrors[`party_${i}`] = 'Party name is required';
      });
    }
    
    if (step === 2) {
      if (!formData.summary || formData.summary.length < 20) {
        newErrors.summary = 'Summary must be at least 20 characters';
      }
      if (!formData.relief_sought || formData.relief_sought.length < 10) {
        newErrors.relief_sought = 'Relief sought must be at least 10 characters';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSaveDraft = () => {
    const caseId = addCase({
      number: `SSB/LGL/${new Date().getFullYear()}/${String(Date.now()).slice(-3)}`,
      title: formData.title || 'Draft Case',
      type: formData.type || 'Non-Payment',
      status: 'Draft',
      stage: 'Draft',
      priority: formData.priority,
      parties: formData.parties.map(p => p.name).filter(Boolean),
      assignee: 'Current User',
      filed_at: new Date().toISOString(),
      next_event_at: null,
      summary: formData.summary || '',
      relief_sought: formData.relief_sought || '',
      flags: [],
      activities: [],
      hearings: []
    });
    
    toast.success('Draft saved successfully');
    navigate(`/legal/cases/${caseId}`);
  };

  const handleSubmit = () => {
    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }
    
    const caseId = addCase({
      number: `SSB/LGL/${new Date().getFullYear()}/${String(Date.now()).slice(-3)}`,
      title: formData.title,
      type: formData.type,
      status: 'Filed',
      stage: 'Pre-Filing',
      priority: formData.priority,
      parties: formData.parties.map(p => p.name).filter(Boolean),
      assignee: 'Current User',
      filed_at: new Date().toISOString(),
      next_event_at: null,
      summary: formData.summary,
      relief_sought: formData.relief_sought,
      flags: [],
      activities: [],
      hearings: []
    });
    
    toast.success('Case filed successfully');
    navigate(`/legal/cases/${caseId}`);
  };

  const steps = ['Basics', 'Parties', 'Subject', 'Attachments', 'Review'];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
        <h1 className="text-3xl font-bold">New Case Intake</h1>
        <p className="text-muted-foreground mt-2">File a new legal case against an employer or entity</p>
      </div>

      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                index < currentStep ? 'bg-[#166534] text-white' :
                index === currentStep ? 'bg-[#1D4ED8] text-white' :
                'bg-[#F3F4F6] text-[#111827]'
              }`}>
                {index < currentStep ? '✓' : index + 1}
              </div>
              <span className={`mt-2 text-xs font-medium ${index === currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && <div className="flex-1 h-0.5 bg-muted mx-2" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep]}</CardTitle>
          <CardDescription>
            {currentStep === 0 && 'Provide basic case information'}
            {currentStep === 1 && 'Add parties involved in the case'}
            {currentStep === 2 && 'Describe the case subject and relief sought'}
            {currentStep === 3 && 'Upload supporting documents'}
            {currentStep === 4 && 'Review and submit your case'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 0: Basics */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Case Type *</Label>
                <Select value={formData.type} onValueChange={(v) => updateField('type', v)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select case type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => updateField('priority', v)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Case Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g., SSB vs. ABC Company Ltd."
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>
            </div>
          )}

          {/* Step 1: Parties */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {formData.parties.map((party, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select 
                          value={party.role} 
                          onValueChange={(v) => updateParty(index, 'role', v)}
                          disabled={index === 0}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Applicant">Applicant</SelectItem>
                            <SelectItem value="Respondent">Respondent</SelectItem>
                            <SelectItem value="Third Party">Third Party</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <div className="flex gap-2">
                          <Input
                            value={party.name}
                            onChange={(e) => updateParty(index, 'name', e.target.value)}
                            placeholder="Party name"
                            disabled={index === 0}
                          />
                          {index > 0 && (
                            <Button variant="outline" size="icon" onClick={() => removeParty(index)}>×</Button>
                          )}
                        </div>
                        {errors[`party_${index}`] && <p className="text-sm text-destructive">{errors[`party_${index}`]}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {errors.parties && <p className="text-sm text-destructive">{errors.parties}</p>}
              <Button onClick={addParty} variant="outline">Add Party</Button>
            </div>
          )}

          {/* Step 2: Subject */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="summary">Case Summary *</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  placeholder="Provide a detailed summary of the case (minimum 20 characters)"
                  rows={5}
                />
                {errors.summary && <p className="text-sm text-destructive">{errors.summary}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="relief">Relief Sought *</Label>
                <Textarea
                  id="relief"
                  value={formData.relief_sought}
                  onChange={(e) => updateField('relief_sought', e.target.value)}
                  placeholder="Describe the relief or remedy being sought (minimum 10 characters)"
                  rows={3}
                />
                {errors.relief_sought && <p className="text-sm text-destructive">{errors.relief_sought}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Attachments */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Upload supporting documents for this case</p>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-muted-foreground">Drag and drop files or click to browse</p>
                <Button variant="outline" className="mt-4">Browse Files</Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Case Details</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div><dt className="text-muted-foreground">Type:</dt><dd className="font-medium">{formData.type}</dd></div>
                  <div><dt className="text-muted-foreground">Priority:</dt><dd className="font-medium">{formData.priority}</dd></div>
                  <div className="col-span-2"><dt className="text-muted-foreground">Title:</dt><dd className="font-medium">{formData.title}</dd></div>
                </dl>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Parties</h3>
                <ul className="space-y-1 text-sm">
                  {formData.parties.map((p, i) => (
                    <li key={i}><span className="text-muted-foreground">{p.role}:</span> {p.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-sm text-muted-foreground">{formData.summary}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Relief Sought</h3>
                <p className="text-sm text-muted-foreground">{formData.relief_sought}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button onClick={handleBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSaveDraft} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          {currentStep < 4 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-2" />
              File Case
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
