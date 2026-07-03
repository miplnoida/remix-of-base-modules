/** @deprecated Legal V1 prototype — routes redirect to canonical Legal V1 screens. Pending deletion one release cycle after 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar as CalendarIcon, Save, Gavel } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { LegalFinalService } from '@/services/legalFinalService';
import { CourtCase, HearingJudgment } from '@/types/legalFinal';

const hearingJudgmentSchema = z.object({
  hearingDate: z.date({
    required_error: "Hearing date is required",
  }),
  courtNotes: z.string().min(10, 'Court notes must be at least 10 characters'),
  outcome: z.enum(['Adjourned', 'Judgment Reserved', 'Judgment Delivered']),
  judgmentSummary: z.string().optional(),
  amountAwarded: z.number().optional(),
  penalties: z.number().optional(),
  paymentPlanDetails: z.string().optional(),
});

type HearingJudgmentFormData = z.infer<typeof hearingJudgmentSchema>;

export const HearingJudgmentForm = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [courtCase, setCourtCase] = useState<CourtCase | null>(null);
  const [hearings, setHearings] = useState<HearingJudgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<HearingJudgmentFormData>({
    resolver: zodResolver(hearingJudgmentSchema),
    defaultValues: {
      courtNotes: '',
      judgmentSummary: '',
      paymentPlanDetails: '',
    }
  });

  const selectedOutcome = form.watch('outcome');

  useEffect(() => {
    const loadCaseAndHearings = async () => {
      if (!caseId) return;
      
      try {
        const [caseData, hearingsData] = await Promise.all([
          LegalFinalService.getCourtCaseById(caseId),
          LegalFinalService.getCaseHearings(caseId)
        ]);
        
        if (caseData) {
          setCourtCase(caseData);
          setHearings(hearingsData);
        } else {
          toast({
            title: "Error",
            description: "Case not found",
            variant: "destructive",
          });
          navigate('/legal-final/cases');
        }
      } catch (error) {
        console.error('Failed to load case and hearings:', error);
        toast({
          title: "Error",
          description: "Failed to load case details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCaseAndHearings();
  }, [caseId, toast, navigate]);

  const onSubmit = async (data: HearingJudgmentFormData) => {
    if (!caseId) return;

    setSubmitting(true);
    try {
      const newHearing = await LegalFinalService.createHearing({
        caseID: caseId,
        hearingDate: data.hearingDate.toISOString().split('T')[0],
        courtNotes: data.courtNotes,
        outcome: data.outcome,
        judgmentSummary: data.judgmentSummary,
        amountAwarded: data.amountAwarded,
        penalties: data.penalties,
        paymentPlanDetails: data.paymentPlanDetails,
      });

      setHearings([...hearings, newHearing]);
      form.reset();
      
      // Update case status if judgment delivered
      if (data.outcome === 'Judgment Delivered') {
        await LegalFinalService.updateCourtCase(caseId, {
          caseStatus: 'Judgment Delivered'
        });
      }
      
      toast({
        title: "Hearing Record Created",
        description: `Hearing for ${data.hearingDate.toLocaleDateString()} recorded successfully`,
      });
    } catch (error) {
      console.error('Failed to create hearing record:', error);
      toast({
        title: "Error",
        description: "Failed to create hearing record",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'Judgment Delivered': return 'success';
      case 'Judgment Reserved': return 'warning';
      case 'Adjourned': return 'destructive';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading case hearings...</p>
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
          <h1 className="text-3xl font-bold">Hearing & Judgment Management</h1>
          <p className="text-muted-foreground">Case {courtCase.caseID} - {courtCase.employerName || courtCase.contributorName}</p>
        </div>
      </div>

      {/* Case Info */}
      <Card>
        <CardHeader>
          <CardTitle>Case Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Case Type</p>
              <p className="font-medium">{courtCase.caseType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{courtCase.caseStatus}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Court Reference</p>
              <p className="font-medium">{courtCase.courtReferenceNumber || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hearings</p>
              <p className="font-medium">{hearings.length} recorded</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* New Hearing Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Record New Hearing
            </CardTitle>
            <CardDescription>
              Record court hearing details and outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="hearingDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Hearing Date</FormLabel>
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
                                <span>Pick hearing date</span>
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
                            disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hearing Outcome</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Adjourned">Adjourned</SelectItem>
                          <SelectItem value="Judgment Reserved">Judgment Reserved</SelectItem>
                          <SelectItem value="Judgment Delivered">Judgment Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="courtNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Court Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter detailed notes about the hearing proceedings..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Record what transpired during the hearing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedOutcome === 'Judgment Delivered' && (
                  <>
                    <FormField
                      control={form.control}
                      name="judgmentSummary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Judgment Summary</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter summary of the judgment delivered..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="amountAwarded"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount Awarded ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="penalties"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Penalties ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="paymentPlanDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Plan Details (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter payment plan details if applicable..."
                              className="min-h-[60px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Button type="submit" disabled={submitting} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? 'Recording...' : 'Record Hearing'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Hearing Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Hearing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{hearings.length}</div>
                  <div className="text-sm text-muted-foreground">Total Hearings</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {hearings.filter(h => h.outcome === 'Judgment Delivered').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Judgments</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {hearings.filter(h => h.outcome === 'Adjourned').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Adjourned</div>
                </div>
              </div>
              
              {hearings.some(h => h.amountAwarded) && (
                <div className="pt-4 border-t">
                  <div className="text-center">
                    <div className="text-lg font-bold">
                      ${hearings.reduce((sum, h) => sum + (h.amountAwarded || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Amount Awarded</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hearings History */}
      <Card>
        <CardHeader>
          <CardTitle>Hearing History</CardTitle>
          <CardDescription>
            Complete record of all hearings for this case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hearings.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hearing Date</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Amount Awarded</TableHead>
                    <TableHead>Penalties</TableHead>
                    <TableHead>Court Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hearings.map((hearing) => (
                    <TableRow key={hearing.hearingID}>
                      <TableCell className="font-medium">{hearing.hearingDate}</TableCell>
                      <TableCell>
                        <Badge variant={getOutcomeColor(hearing.outcome) as any}>
                          {hearing.outcome}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hearing.amountAwarded ? `$${hearing.amountAwarded.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        {hearing.penalties ? `$${hearing.penalties.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {hearing.courtNotes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hearings recorded yet</p>
              <p className="text-sm text-muted-foreground">Record your first hearing using the form above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};