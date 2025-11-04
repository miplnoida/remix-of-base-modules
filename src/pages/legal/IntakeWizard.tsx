import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Save, Send, X, Scale, Home, FileText, Upload } from 'lucide-react';
import { LegalService } from '@/services/legalService';
import { CaseType, CaseSource, Priority } from '@/types/legal';
import { IntakeUploadDialog } from '@/components/legal/IntakeUploadDialog';

const caseSchema = z.object({
  caseType: z.enum(['Prosecution', 'Compliance', 'Appeal', 'Recovery', 'Employer Dispute', 'IP Dispute', 'Garnishment', 'Other']),
  source: z.enum(['Complaint', 'Referral', 'System', 'Audit']),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  confidential: z.boolean(),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  summary: z.string().min(20, 'Summary must be at least 20 characters'),
  reliefSought: z.string().min(10, 'Relief sought must be at least 10 characters'),
  enforcementFunnel: z.string().optional(),
  assignedOfficers: z.array(z.string()).optional(),
});

type CaseFormData = z.infer<typeof caseSchema>;

const STEPS = [
  { id: 1, name: 'Case Basics' },
  { id: 2, name: 'Parties' },
  { id: 3, name: 'Subject Matter' },
  { id: 4, name: 'Attachments' },
  { id: 5, name: 'Review & Submit' },
];

export const IntakeWizard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, type: string}>>([]);

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      caseType: 'Compliance',
      source: 'Complaint',
      priority: 'Medium',
      confidential: false,
      title: '',
      summary: '',
      reliefSought: '',
      enforcementFunnel: '',
      assignedOfficers: [],
    },
  });

  const onSubmit = async (data: CaseFormData, isDraft: boolean = false) => {
    setSubmitting(true);
    try {
      await LegalService.createCase(data);
      toast({
        title: isDraft ? 'Draft Saved' : 'Case Created',
        description: `Case has been ${isDraft ? 'saved as draft' : 'submitted for review'}`,
      });
      navigate('/legal/cases');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create case',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/legal/cases')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cases
          </Button>
          <div>
            <h1 className="text-3xl font-bold">New Legal Case</h1>
            <p className="text-muted-foreground">Complete the form to create a new case</p>
          </div>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        step.id === currentStep
                          ? 'bg-primary text-primary-foreground'
                          : step.id < currentStep
                          ? 'bg-green-600 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {step.id}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${step.id === currentStep ? 'text-primary' : ''}`}>
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 h-0.5 bg-muted mx-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
            <CardDescription>
              Step {currentStep} of {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                {/* Step 1: Case Basics */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="caseType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Case Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Prosecution">Prosecution</SelectItem>
                              <SelectItem value="Compliance">Compliance</SelectItem>
                              <SelectItem value="Appeal">Appeal</SelectItem>
                              <SelectItem value="Recovery">Recovery</SelectItem>
                              <SelectItem value="Employer Dispute">Employer Dispute</SelectItem>
                              <SelectItem value="IP Dispute">IP Dispute</SelectItem>
                              <SelectItem value="Garnishment">Garnishment</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Complaint">Complaint</SelectItem>
                                <SelectItem value="Referral">Referral</SelectItem>
                                <SelectItem value="System">System</SelectItem>
                                <SelectItem value="Audit">Audit</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="confidential"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>Confidential Case</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Mark this case as confidential to restrict access
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Case Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="Brief descriptive title..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="enforcementFunnel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Enforcement Funnel</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select enforcement funnel" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Investigation">Investigation</SelectItem>
                              <SelectItem value="Filing">Filing</SelectItem>
                              <SelectItem value="Litigation">Litigation</SelectItem>
                              <SelectItem value="Judgment">Judgment</SelectItem>
                              <SelectItem value="Collection">Collection</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assignedOfficers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Officers</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              const current = field.value || [];
                              if (!current.includes(value)) {
                                field.onChange([...current, value]);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select officers" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Officer A">Officer A</SelectItem>
                              <SelectItem value="Officer B">Officer B</SelectItem>
                              <SelectItem value="Officer C">Officer C</SelectItem>
                              <SelectItem value="Officer D">Officer D</SelectItem>
                            </SelectContent>
                          </Select>
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((officer) => (
                                <div key={officer} className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded">
                                  <span className="text-sm">{officer}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      field.onChange(field.value?.filter(o => o !== officer));
                                    }}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Parties */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Add parties involved in this case. You can search the registry or enter manually.
                    </p>
                    <div className="space-y-4 border rounded-lg p-4">
                      <h3 className="font-medium">Manual Entry</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <FormLabel>Party Name</FormLabel>
                          <Input placeholder="Enter party name" />
                        </div>
                        <div>
                          <FormLabel>Party Type</FormLabel>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Respondent">Respondent</SelectItem>
                              <SelectItem value="Complainant">Complainant</SelectItem>
                              <SelectItem value="Witness">Witness</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <FormLabel>TIN</FormLabel>
                          <Input placeholder="Enter TIN" />
                        </div>
                        <div>
                          <FormLabel>Contact</FormLabel>
                          <Input placeholder="Enter contact info" />
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm">
                        Add Party
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Subject Matter */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="summary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Case Summary *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detailed description of the case..."
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reliefSought"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relief Sought *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="What outcome or remedy is being sought..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Attachments */}
                {currentStep === 4 && (
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
                    {uploadedFiles.length > 0 ? (
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="font-medium">{file.name}</span>
                              <span className="text-sm text-muted-foreground">({file.type})</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
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

                {/* Step 5: Review */}
                {currentStep === 5 && (
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <p className="text-sm font-medium">Case Type</p>
                        <p className="text-muted-foreground">{form.watch('caseType')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Title</p>
                        <p className="text-muted-foreground">{form.watch('title')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Summary</p>
                        <p className="text-muted-foreground">{form.watch('summary')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => form.handleSubmit(data => onSubmit(data, true))()}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            {currentStep < STEPS.length ? (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={form.handleSubmit(data => onSubmit(data, false))} disabled={submitting}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </Button>
            )}
          </div>
        </div>

        {/* Upload Dialog */}
        <IntakeUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onDocumentUploaded={(file) => {
            setUploadedFiles([...uploadedFiles, file]);
          }}
        />
      </div>
    </div>
  );
};
