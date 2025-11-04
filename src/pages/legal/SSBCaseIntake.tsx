import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { ArrowLeft, ArrowRight, Save, Send, Search, X, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { useLegalCases } from "@/contexts/LegalCaseContext";
import { peopleAdapter } from "@/adapters/peopleAdapter";
import { employersAdapter } from "@/adapters/employersAdapter";
import { IntakeUploadDialog } from "@/components/legal/IntakeUploadDialog";

const CASE_TYPES = ['Employer Arrears', 'Overpayment Recovery', 'Insured Appeal', 'Compliance/Recovery', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const SOURCES = ['Compliance', 'Benefits', 'Other'];
const STATUSES = [
  "Draft",
  "Filed",
  "Under Review",
  "Hearing Scheduled",
  "Hearing Held",
  "Decision Pending",
  "Order Issued",
  "Closed – Compliant",
  "Closed – Non-Compliant",
  "Withdrawn",
  "Appealed",
  "Reopened"
];
const DOCUMENT_TYPES = ['Evidence', 'Order', 'Correspondence', 'Other'];
const COUNTRY_CODES = ['+1-869', '+1', '+44', '+91', '+86'];
const ENFORCEMENT_FUNNELS = ['Summons', 'JDS', 'Warrant', 'Writ'];
const ASSIGNED_OFFICERS = ['Officer A', 'Officer B', 'Officer C', 'Officer D'];

export default function SSBCaseIntake() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addCase, getCaseById, updateCase } = useLegalCases();
  const [currentStep, setCurrentStep] = useState(0);
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    caseId: `SSB-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    date: new Date().toISOString().split('T')[0],
    type: '',
    source: 'Compliance',
    priority: 'Medium',
    status: 'Draft',
    enforcementFunnel: '',
    assignedOfficers: [] as string[],
    courtReferenceNumber: '',
    confidential: false,
    title: '',
    summary: '',
    relatedCases: [],
    parties: [] as Array<{ 
      role: string; 
      type: 'employer' | 'insured' | 'manual'; 
      id?: string; 
      name: string; 
      email?: string;
      phone?: string;
      countryCode?: string;
      address?: string;
      gender?: string;
      dob?: string;
      contact?: string; 
      regNo?: string; 
      ssn?: string;
      tin?: string;
    }>,
    attachments: [] as Array<{ name: string; type: string; documentType: string }>
  });

  // Load existing case data in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const existingCase = getCaseById(id);
      if (existingCase) {
        setFormData({
          caseId: existingCase.number,
          date: existingCase.filed_at,
          type: existingCase.type,
          source: 'Compliance',
          priority: existingCase.priority,
          status: existingCase.status,
          enforcementFunnel: '',
          assignedOfficers: [],
          courtReferenceNumber: '',
          confidential: false,
          title: existingCase.title,
          summary: existingCase.summary,
          relatedCases: [],
          parties: existingCase.parties.map(name => ({
            role: 'Respondent',
            type: 'manual' as const,
            name
          })),
          attachments: []
        });
      }
    }
  }, [isEditMode, id, getCaseById]);

  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupType, setLookupType] = useState<'employer' | 'insured'>('employer');
  const [editingPartyIndex, setEditingPartyIndex] = useState<number | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors; });
    }
  };

  const handleLookup = async () => {
    if (!lookupQuery.trim()) {
      toast.error('Please enter a registration number or SSN');
      return;
    }

    try {
      if (lookupType === 'employer') {
        const employer = await employersAdapter.getEmployer(lookupQuery);
        if (employer) {
          setFormData(prev => ({
            ...prev,
            parties: [...prev.parties, { 
              role: 'Respondent', 
              type: 'employer', 
              id: employer.regNo,
              name: employer.name,
              contact: employer.contact?.phone || employer.contact?.email || '',
              regNo: employer.regNo
            }]
          }));
          setLookupQuery('');
          toast.success(`Employer ${employer.name} added`);
        } else {
          toast.error('Employer not found');
        }
      } else {
        const person = await peopleAdapter.getPerson(lookupQuery);
        if (person) {
          setFormData(prev => ({
            ...prev,
            parties: [...prev.parties, { 
              role: 'Respondent', 
              type: 'insured', 
              id: person.ssn,
              name: person.name,
              contact: person.contact?.phone || person.contact?.email || '',
              ssn: person.ssn
            }]
          }));
          setLookupQuery('');
          toast.success(`Insured person ${person.name} added`);
        } else {
          toast.error('Person not found');
        }
      }
    } catch (error) {
      toast.error('Lookup failed. Please try manual entry.');
    }
  };

  const addManualParty = () => {
    setFormData(prev => ({
      ...prev,
      parties: [...prev.parties, { 
        role: 'Respondent', 
        type: 'manual', 
        name: '', 
        email: '',
        phone: '',
        countryCode: '+1-869',
        address: '',
        gender: '',
        dob: '',
        tin: ''
      }]
    }));
  };

  const editParty = (index: number) => {
    setEditingPartyIndex(index);
  };

  const savePartyEdit = () => {
    setEditingPartyIndex(null);
  };

  const updateParty = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.map((p, i) => i === index ? { ...p, [field]: value } : p)
    }));
  };

  const removeParty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      if (!formData.type) newErrors.type = 'Case type is required';
      if (!formData.source) newErrors.source = 'Source is required';
      if (!formData.enforcementFunnel) newErrors.enforcementFunnel = 'Enforcement funnel is required';
      if (formData.assignedOfficers.length === 0) newErrors.assignedOfficers = 'At least one officer must be assigned';
      if (!formData.status) newErrors.status = 'Status is required';
    }
    
    if (step === 1) {
      if (formData.parties.length < 1) newErrors.parties = 'At least one party is required';
      formData.parties.forEach((p, i) => {
        if (!p.name) newErrors[`party_${i}_name`] = 'Party name is required';
        if (p.type === 'manual') {
          if (!p.email) newErrors[`party_${i}_email`] = 'Email is required';
          if (!p.phone) newErrors[`party_${i}_phone`] = 'Phone is required';
        }
      });
    }
    
    if (step === 2) {
      if (!formData.summary || formData.summary.length < 20) {
        newErrors.summary = 'Summary must be at least 20 characters';
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
    if (isEditMode && id) {
      updateCase(id, {
        title: formData.title || 'Draft Case',
        type: formData.type || 'Non-Payment',
        priority: formData.priority,
        assignee: formData.assignedOfficers.join(', ') || 'Unassigned',
        summary: formData.summary || ''
      });
      toast.success('Case updated successfully');
      navigate(`/legal/cases/${id}`);
    } else {
      const caseId = addCase({
        number: `SSB/LGL/${new Date().getFullYear()}/${String(Date.now()).slice(-3)}`,
        title: formData.title || 'Draft Case',
        type: formData.type || 'Non-Payment',
        status: 'Draft',
        stage: 'Draft',
        priority: formData.priority,
        parties: formData.parties.map(p => p.name).filter(Boolean),
        assignee: formData.assignedOfficers.join(', ') || 'Unassigned',
        filed_at: formData.date,
        next_event_at: null,
        summary: formData.summary || '',
        relief_sought: '',
        flags: [],
        activities: [],
        hearings: []
      });
      
      toast.success('Draft saved successfully');
      navigate(`/legal/cases/${caseId}`);
    }
  };

  const handleSubmit = () => {
    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }
    
    if (isEditMode && id) {
      updateCase(id, {
        title: formData.title || `${formData.type} - ${formData.caseId}`,
        type: formData.type,
        status: formData.status,
        priority: formData.priority,
        assignee: formData.assignedOfficers.join(', '),
        summary: formData.summary
      });
      toast.success('Case updated successfully');
      navigate(`/legal/cases/${id}`);
    } else {
      const caseId = addCase({
        number: formData.caseId,
        title: formData.title || `${formData.type} - ${formData.caseId}`,
        type: formData.type,
        status: formData.status,
        stage: 'Pre-Filing',
        priority: formData.priority,
        parties: formData.parties.map(p => p.name).filter(Boolean),
        assignee: formData.assignedOfficers.join(', '),
        filed_at: formData.date,
        next_event_at: null,
        summary: formData.summary,
        relief_sought: '',
        flags: [],
        activities: [],
        hearings: []
      });
      
      toast.success('Case filed successfully');
      navigate(`/legal/cases/${caseId}`);
    }
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
        <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Case' : 'New Case Intake'}</h1>
        <p className="text-muted-foreground mt-2">
          {isEditMode ? 'Update case information' : 'File a new legal case against an employer or entity'}
        </p>
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
            {currentStep === 2 && 'Describe the case subject and summary'}
            {currentStep === 3 && 'Upload supporting documents'}
            {currentStep === 4 && 'Review and submit your case'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 0: Basics */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="caseId">Case ID</Label>
                  <Input
                    id="caseId"
                    value={formData.caseId}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

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
                <Label htmlFor="source">Source *</Label>
                <Select value={formData.source} onValueChange={(v) => updateField('source', v)}>
                  <SelectTrigger id="source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.source && <p className="text-sm text-destructive">{errors.source}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority *</Label>
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
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enforcementFunnel">Enforcement Funnel *</Label>
                <Select value={formData.enforcementFunnel} onValueChange={(v) => updateField('enforcementFunnel', v)}>
                  <SelectTrigger id="enforcementFunnel">
                    <SelectValue placeholder="Select enforcement funnel" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENFORCEMENT_FUNNELS.map(funnel => (
                      <SelectItem key={funnel} value={funnel}>{funnel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.enforcementFunnel && <p className="text-sm text-destructive">{errors.enforcementFunnel}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedOfficers">Assigned Officers *</Label>
                <Select onValueChange={(v) => {
                  if (!formData.assignedOfficers.includes(v)) {
                    updateField('assignedOfficers', [...formData.assignedOfficers, v]);
                  }
                }}>
                  <SelectTrigger id="assignedOfficers">
                    <SelectValue placeholder="Select officers" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNED_OFFICERS.map(officer => (
                      <SelectItem key={officer} value={officer}>{officer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.assignedOfficers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.assignedOfficers.map((officer) => (
                      <div key={officer} className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded">
                        <span className="text-sm">{officer}</span>
                        <button
                          type="button"
                          onClick={() => {
                            updateField('assignedOfficers', formData.assignedOfficers.filter(o => o !== officer));
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {errors.assignedOfficers && <p className="text-sm text-destructive">{errors.assignedOfficers}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="courtReferenceNumber">Court Reference Number</Label>
                <Input
                  id="courtReferenceNumber"
                  value={formData.courtReferenceNumber}
                  onChange={(e) => updateField('courtReferenceNumber', e.target.value.toUpperCase())}
                  placeholder="Enter alphanumeric reference (e.g., CR-2025-001)"
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">Optional alphanumeric court reference number</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Case Title (Optional - Auto-generated if empty)</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="e.g., SSB vs. ABC Company Ltd."
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Title will be auto-generated during intake</p>
              </div>
            </div>
          )}

          {/* Step 1: Parties */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lookup Employer or Insured Person</CardTitle>
                  <CardDescription>Search by Registration Number (Employer) or SSN (Insured)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={lookupType === 'employer' ? 'default' : 'outline'}
                        onClick={() => setLookupType('employer')}
                        className="flex-1"
                      >
                        Employer
                      </Button>
                      <Button
                        type="button"
                        variant={lookupType === 'insured' ? 'default' : 'outline'}
                        onClick={() => setLookupType('insured')}
                        className="flex-1"
                      >
                        Insured Person
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={lookupQuery}
                        onChange={(e) => setLookupQuery(e.target.value)}
                        placeholder={lookupType === 'employer' ? 'Enter Registration Number' : 'Enter SSN'}
                        onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                      />
                      <Button onClick={handleLookup}>
                        <Search className="h-4 w-4 mr-2" />
                        Lookup
                      </Button>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">or</div>
                    <Button onClick={addManualParty} variant="outline" className="w-full">
                      Add Party Manually
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Parties ({formData.parties.length})</Label>
                {formData.parties.length === 0 && (
                  <p className="text-sm text-muted-foreground">No parties added yet. Use lookup or manual entry above.</p>
                )}
                {formData.parties.map((party, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={party.type === 'employer' ? 'default' : party.type === 'insured' ? 'secondary' : 'outline'}>
                            {party.type === 'employer' ? 'Employer' : party.type === 'insured' ? 'Insured' : 'Manual'}
                          </Badge>
                          {party.regNo && <span className="text-xs text-muted-foreground">Reg: {party.regNo}</span>}
                          {party.ssn && <span className="text-xs text-muted-foreground">SSN: {party.ssn}</span>}
                        </div>
                        <div className="flex gap-2">
                          {party.type === 'manual' && editingPartyIndex !== index && (
                            <Button variant="ghost" size="sm" onClick={() => editParty(index)}>
                              Edit
                            </Button>
                          )}
                          {editingPartyIndex === index && (
                            <Button variant="ghost" size="sm" onClick={savePartyEdit}>
                              Save
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => removeParty(index)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Role *</Label>
                          <Select 
                            value={party.role} 
                            onValueChange={(v) => updateParty(index, 'role', v)}
                            disabled={party.type !== 'manual' || editingPartyIndex !== index}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Respondent">Respondent</SelectItem>
                              <SelectItem value="Third Party">Third Party</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={party.name}
                            onChange={(e) => updateParty(index, 'name', e.target.value)}
                            placeholder="Party name"
                            disabled={party.type !== 'manual' || editingPartyIndex !== index}
                          />
                          {errors[`party_${index}_name`] && <p className="text-sm text-destructive">{errors[`party_${index}_name`]}</p>}
                        </div>
                        {party.type === 'manual' && (
                          <>
                            <div className="space-y-2">
                              <Label>Email *</Label>
                              <Input
                                type="email"
                                value={party.email || ''}
                                onChange={(e) => updateParty(index, 'email', e.target.value)}
                                placeholder="email@example.com"
                                disabled={editingPartyIndex !== index}
                              />
                              {errors[`party_${index}_email`] && <p className="text-sm text-destructive">{errors[`party_${index}_email`]}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label>Phone Number *</Label>
                              <div className="flex gap-2">
                                <Select 
                                  value={party.countryCode || '+1-869'} 
                                  onValueChange={(v) => updateParty(index, 'countryCode', v)}
                                  disabled={editingPartyIndex !== index}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {COUNTRY_CODES.map(code => (
                                      <SelectItem key={code} value={code}>{code}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  value={party.phone || ''}
                                  onChange={(e) => updateParty(index, 'phone', e.target.value)}
                                  placeholder="123-4567"
                                  disabled={editingPartyIndex !== index}
                                  className="flex-1"
                                />
                              </div>
                              {errors[`party_${index}_phone`] && <p className="text-sm text-destructive">{errors[`party_${index}_phone`]}</p>}
                            </div>
                            <div className="col-span-2 space-y-2">
                              <Label>Address</Label>
                              <Input
                                value={party.address || ''}
                                onChange={(e) => updateParty(index, 'address', e.target.value)}
                                placeholder="Full address"
                                disabled={editingPartyIndex !== index}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Gender</Label>
                              <Select 
                                value={party.gender || ''} 
                                onValueChange={(v) => updateParty(index, 'gender', v)}
                                disabled={editingPartyIndex !== index}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Date of Birth</Label>
                              <Input
                                type="date"
                                value={party.dob || ''}
                                onChange={(e) => updateParty(index, 'dob', e.target.value)}
                                disabled={editingPartyIndex !== index}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>TIN</Label>
                              <Input
                                value={party.tin || ''}
                                onChange={(e) => updateParty(index, 'tin', e.target.value)}
                                placeholder="Enter TIN"
                                disabled={editingPartyIndex !== index}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {errors.parties && <p className="text-sm text-destructive">{errors.parties}</p>}
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
                  rows={8}
                />
                {errors.summary && <p className="text-sm text-destructive">{errors.summary}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Attachments */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Upload supporting documents (pdf, docx, jpg, png)
                </p>
                <Button type="button" onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </div>
              {formData.attachments.length > 0 ? (
                <div className="space-y-2">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between border rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium">{file.name}</span>
                        <span className="text-sm text-muted-foreground">({file.documentType})</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            attachments: prev.attachments.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <p className="text-muted-foreground">No documents uploaded yet</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Case ID:</dt>
                      <dd className="font-medium">{formData.caseId}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Date:</dt>
                      <dd className="font-medium">{new Date(formData.date).toLocaleDateString()}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Type:</dt>
                      <dd className="font-medium">{formData.type}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Source:</dt>
                      <dd className="font-medium">{formData.source}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Priority:</dt>
                      <dd className="font-medium">{formData.priority}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Status:</dt>
                      <dd className="font-medium">{formData.status}</dd>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <dt className="text-muted-foreground">Enforcement Funnel:</dt>
                      <dd className="font-medium">{formData.enforcementFunnel}</dd>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <dt className="text-muted-foreground">Assigned Officers:</dt>
                      <dd className="font-medium">{formData.assignedOfficers.join(', ')}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parties ({formData.parties.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {formData.parties.map((p, i) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{p.role}</Badge>
                          <Badge variant={p.type === 'employer' ? 'default' : p.type === 'insured' ? 'secondary' : 'outline'}>
                            {p.type === 'employer' ? 'Employer' : p.type === 'insured' ? 'Insured' : 'Manual'}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{p.name}</p>
                        {p.email && <p className="text-xs text-muted-foreground">Email: {p.email}</p>}
                        {p.phone && <p className="text-xs text-muted-foreground">Phone: {p.countryCode} {p.phone}</p>}
                        {p.address && <p className="text-xs text-muted-foreground">Address: {p.address}</p>}
                        {p.regNo && <p className="text-xs text-muted-foreground">Reg: {p.regNo}</p>}
                        {p.ssn && <p className="text-xs text-muted-foreground">SSN: {p.ssn}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Case Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap break-words">{formData.summary}</p>
                </CardContent>
              </Card>

              {formData.attachments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Attachments ({formData.attachments.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {formData.attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="text-sm font-medium truncate max-w-md">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.documentType}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
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
              Submit Case
            </Button>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <IntakeUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onDocumentUploaded={(file) => {
          setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, { ...file, documentType: file.type }]
          }));
        }}
      />
    </div>
  );
}
