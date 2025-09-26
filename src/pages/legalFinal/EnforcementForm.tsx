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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Save, DollarSign, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LegalFinalService } from '@/services/legalFinalService';
import { CourtCase, Enforcement } from '@/types/legalFinal';

const enforcementSchema = z.object({
  enforcementType: z.enum(['Garnishment', 'Seizure of Assets', 'Payment Plan', 'Voluntary Settlement']),
  amountOrdered: z.number().min(0.01, 'Amount ordered must be greater than 0'),
  amountCollected: z.number().min(0, 'Amount collected cannot be negative'),
  officerResponsible: z.string().min(1, 'Officer responsible is required'),
  notes: z.string().optional(),
}).refine((data) => data.amountCollected <= data.amountOrdered, {
  message: "Amount collected cannot exceed amount ordered",
  path: ["amountCollected"],
});

type EnforcementFormData = z.infer<typeof enforcementSchema>;

export const EnforcementForm = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [courtCase, setCourtCase] = useState<CourtCase | null>(null);
  const [enforcements, setEnforcements] = useState<Enforcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<EnforcementFormData>({
    resolver: zodResolver(enforcementSchema),
    defaultValues: {
      amountOrdered: 0,
      amountCollected: 0,
      officerResponsible: '',
      notes: '',
    }
  });

  useEffect(() => {
    const loadCaseAndEnforcements = async () => {
      if (!caseId) return;
      
      try {
        const [caseData, enforcementsData] = await Promise.all([
          LegalFinalService.getCourtCaseById(caseId),
          LegalFinalService.getCaseEnforcements(caseId)
        ]);
        
        if (caseData) {
          setCourtCase(caseData);
          setEnforcements(enforcementsData);
        } else {
          toast({
            title: "Error",
            description: "Case not found",
            variant: "destructive",
          });
          navigate('/legal-final/cases');
        }
      } catch (error) {
        console.error('Failed to load case and enforcements:', error);
        toast({
          title: "Error",
          description: "Failed to load case details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCaseAndEnforcements();
  }, [caseId, toast, navigate]);

  const onSubmit = async (data: EnforcementFormData) => {
    if (!caseId) return;

    setSubmitting(true);
    try {
      const enforcementStatus = data.amountCollected >= data.amountOrdered ? 'Completed' : 'Ongoing';
      
      const newEnforcement = await LegalFinalService.createEnforcement({
        caseID: caseId,
        enforcementType: data.enforcementType,
        enforcementStatus,
        amountOrdered: data.amountOrdered,
        amountCollected: data.amountCollected,
        officerResponsible: data.officerResponsible,
        dateCreated: new Date().toISOString().split('T')[0],
        notes: data.notes,
      });

      setEnforcements([...enforcements, newEnforcement]);
      form.reset();
      
      // Update case status to enforcement ongoing if not already closed
      if (courtCase?.caseStatus !== 'Closed' && courtCase?.caseStatus !== 'Settled') {
        await LegalFinalService.updateCourtCase(caseId, {
          caseStatus: enforcementStatus === 'Completed' ? 'Closed' : 'Enforcement Ongoing'
        });
      }
      
      toast({
        title: "Enforcement Action Created",
        description: `${data.enforcementType} enforcement action recorded successfully`,
      });
    } catch (error) {
      console.error('Failed to create enforcement action:', error);
      toast({
        title: "Error",
        description: "Failed to create enforcement action",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getEnforcementStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Failed': return 'destructive';
      case 'Ongoing': return 'warning';
      default: return 'default';
    }
  };

  const getTotalOrdered = () => enforcements.reduce((sum, e) => sum + e.amountOrdered, 0);
  const getTotalCollected = () => enforcements.reduce((sum, e) => sum + e.amountCollected, 0);
  const getCollectionRate = () => {
    const ordered = getTotalOrdered();
    return ordered > 0 ? (getTotalCollected() / ordered) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading enforcement actions...</p>
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
          <h1 className="text-3xl font-bold">Enforcement Management</h1>
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
              <p className="text-sm text-muted-foreground">Officer</p>
              <p className="font-medium">{courtCase.officerAssigned}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Enforcement Actions</p>
              <p className="font-medium">{enforcements.length} recorded</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      {enforcements.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ordered</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${getTotalOrdered().toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${getTotalCollected().toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getCollectionRate().toFixed(1)}%</div>
              <Progress value={getCollectionRate()} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(getTotalOrdered() - getTotalCollected()).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* New Enforcement Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Record Enforcement Action
            </CardTitle>
            <CardDescription>
              Track collection and enforcement activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="enforcementType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enforcement Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select enforcement type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Garnishment">Garnishment</SelectItem>
                          <SelectItem value="Seizure of Assets">Seizure of Assets</SelectItem>
                          <SelectItem value="Payment Plan">Payment Plan</SelectItem>
                          <SelectItem value="Voluntary Settlement">Voluntary Settlement</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="amountOrdered"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount Ordered ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Total amount ordered by court
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amountCollected"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount Collected ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Amount collected so far
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="officerResponsible"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Officer Responsible</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter officer name" {...field} />
                      </FormControl>
                      <FormDescription>
                        Officer handling this enforcement action
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter additional notes about the enforcement action..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Additional details about the enforcement process
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={submitting} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? 'Recording...' : 'Record Enforcement Action'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Enforcement Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Enforcement Types</CardTitle>
            <CardDescription>
              Breakdown by enforcement method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Garnishment', 'Seizure of Assets', 'Payment Plan', 'Voluntary Settlement'].map((type) => {
                const count = enforcements.filter(e => e.enforcementType === type).length;
                const totalAmount = enforcements
                  .filter(e => e.enforcementType === type)
                  .reduce((sum, e) => sum + e.amountCollected, 0);
                
                return (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{type}</p>
                      <p className="text-sm text-muted-foreground">{count} actions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${totalAmount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">collected</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enforcement History */}
      <Card>
        <CardHeader>
          <CardTitle>Enforcement History</CardTitle>
          <CardDescription>
            Complete record of all enforcement actions for this case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enforcements.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount Ordered</TableHead>
                    <TableHead>Amount Collected</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Officer</TableHead>
                    <TableHead>Date Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enforcements.map((enforcement) => (
                    <TableRow key={enforcement.enforcementID}>
                      <TableCell className="font-medium">{enforcement.enforcementType}</TableCell>
                      <TableCell>
                        <Badge variant={getEnforcementStatusColor(enforcement.enforcementStatus) as any}>
                          {enforcement.enforcementStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>${enforcement.amountOrdered.toLocaleString()}</TableCell>
                      <TableCell>${enforcement.amountCollected.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="w-20">
                          <Progress 
                            value={(enforcement.amountCollected / enforcement.amountOrdered) * 100}
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>{enforcement.officerResponsible}</TableCell>
                      <TableCell>{enforcement.dateCreated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No enforcement actions recorded yet</p>
              <p className="text-sm text-muted-foreground">Record your first enforcement action using the form above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};