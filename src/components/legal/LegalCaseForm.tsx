
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import { CalendarIcon, Upload, FileText, Building2, DollarSign, Gavel, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LegalCaseFormData {
  caseId: string;
  employerName: string;
  employerId: string;
  caseType: string;
  violationType: string;
  filingDate: Date;
  jurisdiction: string;
  assignedOfficer: string;
  violationDescription: string;
  evidenceSummary: string;
  penaltyAmount: string;
  nextHearing: Date;
  status: string;
}

interface LegalCaseFormProps {
  onSubmit: (data: LegalCaseFormData) => void;
  onCancel: () => void;
  initialData?: Partial<LegalCaseFormData>;
}

const LegalCaseForm: React.FC<LegalCaseFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [filingDate, setFilingDate] = useState<Date | undefined>(initialData?.filingDate);
  const [nextHearing, setNextHearing] = useState<Date | undefined>(initialData?.nextHearing);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<LegalCaseFormData>({
    defaultValues: initialData
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onFormSubmit = (data: LegalCaseFormData) => {
    onSubmit({
      ...data,
      filingDate: filingDate!,
      nextHearing: nextHearing!
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Legal Case</h1>
          <p className="text-gray-600">Fill in the details to create a new legal proceeding</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button form="legal-case-form" type="submit">
            <Plus className="h-4 w-4 mr-2" />
            Create Case
          </Button>
        </div>
      </div>

      <form id="legal-case-form" onSubmit={handleSubmit(onFormSubmit)}>
        <Tabs defaultValue="party-info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="party-info" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Party Info
            </TabsTrigger>
            <TabsTrigger value="violations" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Violations
            </TabsTrigger>
            <TabsTrigger value="financials" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financials
            </TabsTrigger>
            <TabsTrigger value="legal-details" className="flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Legal Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="party-info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Case & Party Information</CardTitle>
                <CardDescription>Basic information about the legal case and involved parties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="caseId">Case ID <span className="text-red-500">*</span></Label>
                    <Input 
                      id="caseId" 
                      placeholder="LC-2024-001"
                      {...register('caseId', { required: 'Case ID is required' })}
                    />
                    {errors.caseId && <p className="text-sm text-red-500">{errors.caseId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employerId">Employer ID <span className="text-red-500">*</span></Label>
                    <Input 
                      id="employerId" 
                      placeholder="EMP-001"
                      {...register('employerId', { required: 'Employer ID is required' })}
                    />
                    {errors.employerId && <p className="text-sm text-red-500">{errors.employerId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employerName">Employer Name <span className="text-red-500">*</span></Label>
                    <Input 
                      id="employerName" 
                      placeholder="ABC Manufacturing Ltd"
                      {...register('employerName', { required: 'Employer name is required' })}
                    />
                    {errors.employerName && <p className="text-sm text-red-500">{errors.employerName.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignedOfficer">Assigned Legal Officer <span className="text-red-500">*</span></Label>
                    <Input 
                      id="assignedOfficer" 
                      placeholder="Sarah Johnson"
                      {...register('assignedOfficer', { required: 'Assigned officer is required' })}
                    />
                    {errors.assignedOfficer && <p className="text-sm text-red-500">{errors.assignedOfficer.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Filing Date <span className="text-red-500">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !filingDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {filingDate ? format(filingDate, "PPP") : "Select filing date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={filingDate}
                          onSelect={setFilingDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Case Status</Label>
                    <select 
                      id="status"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      {...register('status')}
                    >
                      <option value="Initiated">Initiated</option>
                      <option value="Under Trial">Under Trial</option>
                      <option value="Judgment Passed">Judgment Passed</option>
                      <option value="Enforced">Enforced</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Violation Details</CardTitle>
                <CardDescription>Details about the compliance violations and evidence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="caseType">Case Type <span className="text-red-500">*</span></Label>
                      <select 
                        id="caseType"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        {...register('caseType', { required: 'Case type is required' })}
                      >
                        <option value="">Select case type</option>
                        <option value="Civil">Civil</option>
                        <option value="Criminal">Criminal</option>
                        <option value="Administrative">Administrative</option>
                      </select>
                      {errors.caseType && <p className="text-sm text-red-500">{errors.caseType.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="violationType">Violation Type <span className="text-red-500">*</span></Label>
                      <select 
                        id="violationType"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        {...register('violationType', { required: 'Violation type is required' })}
                      >
                        <option value="">Select violation type</option>
                        <option value="Late Payment">Late Payment</option>
                        <option value="Under-reporting">Under-reporting</option>
                        <option value="Non-payment">Non-payment</option>
                        <option value="Fraud">Fraud</option>
                        <option value="Non-compliance">Non-compliance</option>
                      </select>
                      {errors.violationType && <p className="text-sm text-red-500">{errors.violationType.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="violationDescription">Violation Description <span className="text-red-500">*</span></Label>
                    <Textarea 
                      id="violationDescription"
                      placeholder="Detailed description of the violation..."
                      rows={4}
                      {...register('violationDescription', { required: 'Violation description is required' })}
                    />
                    {errors.violationDescription && <p className="text-sm text-red-500">{errors.violationDescription.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evidenceSummary">Evidence Summary</Label>
                    <Textarea 
                      id="evidenceSummary"
                      placeholder="Summary of evidence supporting the case..."
                      rows={3}
                      {...register('evidenceSummary')}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Supporting Documents</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">Upload evidence documents, reports, and supporting files</p>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.png,.xlsx"
                        onChange={handleFileUpload}
                        className="mt-2"
                      />
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Uploaded Files:</Label>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{file.name}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
                <CardDescription>Penalty amounts and financial recovery details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="penaltyAmount">Penalty Amount <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input 
                        id="penaltyAmount"
                        type="number"
                        placeholder="15000"
                        className="pl-10"
                        {...register('penaltyAmount', { required: 'Penalty amount is required' })}
                      />
                    </div>
                    {errors.penaltyAmount && <p className="text-sm text-red-500">{errors.penaltyAmount.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentStatus">Payment Status</Label>
                    <select 
                      id="paymentStatus"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="legal-details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Legal Proceedings Details</CardTitle>
                <CardDescription>Court information and hearing schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="jurisdiction">Jurisdiction <span className="text-red-500">*</span></Label>
                      <Input 
                        id="jurisdiction"
                        placeholder="Labor Court District 1"
                        {...register('jurisdiction', { required: 'Jurisdiction is required' })}
                      />
                      {errors.jurisdiction && <p className="text-sm text-red-500">{errors.jurisdiction.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Next Hearing Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !nextHearing && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {nextHearing ? format(nextHearing, "PPP") : "Select hearing date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={nextHearing}
                            onSelect={setNextHearing}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
};

export default LegalCaseForm;
