/** @deprecated Legal V1 prototype — routes redirect to canonical Legal V1 screens. Pending deletion one release cycle after 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LegalFinalService } from '@/services/legalFinalService';
import { CourtCase } from '@/types/legalFinal';

const statusUpdateSchema = z.object({
  caseStatus: z.enum(['Draft', 'Filed', 'Pending Hearing', 'In Court', 'Judgment Delivered', 'Enforcement Ongoing', 'Closed', 'Settled']),
  statusNotes: z.string().min(10, 'Status notes must be at least 10 characters'),
  reasonForChange: z.string().min(5, 'Reason for change is required'),
});

type StatusUpdateFormData = z.infer<typeof statusUpdateSchema>;

export const CaseStatusUpdateForm = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [courtCase, setCourtCase] = useState<CourtCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<StatusUpdateFormData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      statusNotes: '',
      reasonForChange: '',
    }
  });

  useEffect(() => {
    const loadCase = async () => {
      if (!caseId) return;
      
      try {
        const caseData = await LegalFinalService.getCourtCaseById(caseId);
        if (caseData) {
          setCourtCase(caseData);
          form.setValue('caseStatus', caseData.caseStatus);
        } else {
          toast({
            title: "Error",
            description: "Case not found",
            variant: "destructive",
          });
          navigate('/legal-final/cases');
        }
      } catch (error) {
        console.error('Failed to load case:', error);
        toast({
          title: "Error",
          description: "Failed to load case details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCase();
  }, [caseId, toast, navigate, form]);

  const onSubmit = async (data: StatusUpdateFormData) => {
    if (!caseId) return;

    setUpdating(true);
    try {
      await LegalFinalService.updateCourtCase(caseId, {
        caseStatus: data.caseStatus,
        caseNotes: `${courtCase?.caseNotes}\n\n--- Status Update (${new Date().toLocaleDateString()}) ---\nPrevious Status: ${courtCase?.caseStatus}\nNew Status: ${data.caseStatus}\nReason: ${data.reasonForChange}\nNotes: ${data.statusNotes}`
      });

      toast({
        title: "Status Updated",
        description: `Case ${caseId} status updated to ${data.caseStatus}`,
      });

      navigate('/legal-final/cases');
    } catch (error) {
      console.error('Failed to update case status:', error);
      toast({
        title: "Error",
        description: "Failed to update case status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading case...</p>
        </div>
      </div>
    );
  }

  if (!courtCase) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Case not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/legal-final/cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Update Case Status</h1>
          <p className="text-muted-foreground">Case {courtCase.caseID} - {courtCase.employerName || courtCase.contributorName}</p>
        </div>
      </div>

      {/* Current Case Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Case Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Case Type</p>
              <p className="font-medium">{courtCase.caseType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <p className="font-medium">{courtCase.caseStatus}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Officer Assigned</p>
              <p className="font-medium">{courtCase.officerAssigned}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Update Form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
          <CardDescription>
            Change the case status and provide detailed notes about the update
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="caseStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Case Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select new status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Filed">Filed</SelectItem>
                        <SelectItem value="Pending Hearing">Pending Hearing</SelectItem>
                        <SelectItem value="In Court">In Court</SelectItem>
                        <SelectItem value="Judgment Delivered">Judgment Delivered</SelectItem>
                        <SelectItem value="Enforcement Ongoing">Enforcement Ongoing</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                        <SelectItem value="Settled">Settled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reasonForChange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Status Change</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Briefly explain why the status is being changed..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a clear reason for the status change for audit purposes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="statusNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Status Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter detailed notes about the current status, any actions taken, next steps, etc..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide comprehensive details about the case progress and any relevant information
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" disabled={updating}>
                  <Save className="h-4 w-4 mr-2" />
                  {updating ? 'Updating...' : 'Update Status'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/legal-final/cases')}
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