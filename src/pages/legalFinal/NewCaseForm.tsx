/** @deprecated Legal V1 prototype — routes redirect to canonical Legal V1 screens. Pending deletion one release cycle after 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. */
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { LegalFinalService } from '@/services/legalFinalService';
import { CourtCase } from '@/types/legalFinal';

const newCaseSchema = z.object({
  linkedEmployerID: z.string().optional(),
  linkedContributorID: z.string().optional(),
  caseType: z.enum(['Employer Arrears', 'Contributor Dispute', 'Fraud', 'Overpayment', 'Appeal']),
  officerAssigned: z.string().min(1, 'Officer assignment is required'),
  caseNotes: z.string().min(10, 'Case notes must be at least 10 characters'),
  nextHearingDate: z.date().optional(),
  courtReferenceNumber: z.string().optional(),
}).refine((data) => data.linkedEmployerID || data.linkedContributorID, {
  message: "Either an employer or contributor must be selected",
  path: ["linkedEmployerID"],
});

type NewCaseFormData = z.infer<typeof newCaseSchema>;

export const NewCaseForm = () => {
  const [employers, setEmployers] = useState<Array<{id: string, name: string}>>([]);
  const [contributors, setContributors] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<NewCaseFormData>({
    resolver: zodResolver(newCaseSchema),
    defaultValues: {
      caseNotes: '',
      officerAssigned: '',
    }
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [employersData, contributorsData] = await Promise.all([
          LegalFinalService.getEmployers(),
          LegalFinalService.getContributors()
        ]);
        setEmployers(employersData);
        setContributors(contributorsData);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast({
          title: "Error",
          description: "Failed to load employers and contributors data",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [toast]);

  const onSubmit = async (data: NewCaseFormData) => {
    setLoading(true);
    try {
      const selectedEmployer = data.linkedEmployerID ? 
        employers.find(e => e.id === data.linkedEmployerID) : null;
      const selectedContributor = data.linkedContributorID ? 
        contributors.find(c => c.id === data.linkedContributorID) : null;

      const caseData: Omit<CourtCase, 'caseID'> = {
        linkedEmployerID: data.linkedEmployerID,
        linkedContributorID: data.linkedContributorID,
        caseType: data.caseType,
        caseStatus: 'Draft',
        dateOpened: new Date().toISOString().split('T')[0],
        officerAssigned: data.officerAssigned,
        caseNotes: data.caseNotes,
        nextHearingDate: data.nextHearingDate?.toISOString().split('T')[0],
        courtReferenceNumber: data.courtReferenceNumber,
        employerName: selectedEmployer?.name,
        contributorName: selectedContributor?.name,
      };

      const newCase = await LegalFinalService.createCourtCase(caseData);
      
      toast({
        title: "Case Created",
        description: `Case ${newCase.caseID} has been created successfully`,
      });

      navigate('/legal-final/cases');
    } catch (error) {
      console.error('Failed to create case:', error);
      toast({
        title: "Error",
        description: "Failed to create new case",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/legal-final')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Legal Case</h1>
          <p className="text-muted-foreground">Create a new court case for employers or contributors</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
          <CardDescription>
            Fill in the details for the new legal case. Either an employer or contributor must be selected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Employer Selection */}
                <FormField
                  control={form.control}
                  name="linkedEmployerID"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Employer (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employers.map((employer) => (
                            <SelectItem key={employer.id} value={employer.id}>
                              {employer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contributor Selection */}
                <FormField
                  control={form.control}
                  name="linkedContributorID"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Contributor (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contributor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contributors.map((contributor) => (
                            <SelectItem key={contributor.id} value={contributor.id}>
                              {contributor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Case Type */}
                <FormField
                  control={form.control}
                  name="caseType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Case Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select case type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Employer Arrears">Employer Arrears</SelectItem>
                          <SelectItem value="Contributor Dispute">Contributor Dispute</SelectItem>
                          <SelectItem value="Fraud">Fraud</SelectItem>
                          <SelectItem value="Overpayment">Overpayment</SelectItem>
                          <SelectItem value="Appeal">Appeal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Officer Assigned */}
                <FormField
                  control={form.control}
                  name="officerAssigned"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Officer Assigned</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter officer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Court Reference Number */}
                <FormField
                  control={form.control}
                  name="courtReferenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Court Reference Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CV-2024-0123" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave blank if not yet assigned by court
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Next Hearing Date */}
                <FormField
                  control={form.control}
                  name="nextHearingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Next Hearing Date (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Case Notes */}
              <FormField
                control={form.control}
                name="caseNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter detailed case notes, background information, and initial findings..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide comprehensive details about the case, including background, violations, and any relevant context
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Actions */}
              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Case'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/legal-final')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};