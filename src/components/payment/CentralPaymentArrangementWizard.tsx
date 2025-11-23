import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CreateArrangementRequest, 
  CreateArrangementItemRequest, 
  ArrangementSourceModule, 
  ArrangementType,
  SourceType,
  DueItem
} from '@/types/centralPaymentArrangement';
import { centralPaymentArrangementService } from '@/services/centralPaymentArrangementService';
import { toast } from 'sonner';
import { Calendar, DollarSign, FileText, X } from 'lucide-react';

interface CentralPaymentArrangementWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employerId: string;
  employerName: string;
  sourceModule: ArrangementSourceModule;
  preSelectedDues?: DueItem[];
  onArrangementCreated: (arrangementId: string) => void;
}

export function CentralPaymentArrangementWizard({
  open,
  onOpenChange,
  employerId,
  employerName,
  sourceModule,
  preSelectedDues = [],
  onArrangementCreated
}: CentralPaymentArrangementWizardProps) {
  const [step, setStep] = useState(1);
  const [arrangementType, setArrangementType] = useState<ArrangementType>(ArrangementType.VOLUNTARY_PLAN);
  const [selectedDues, setSelectedDues] = useState<DueItem[]>(preSelectedDues);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleType, setScheduleType] = useState<'EQUAL' | 'FIXED_AMOUNT' | 'CUSTOM'>('EQUAL');
  const [numberOfInstallments, setNumberOfInstallments] = useState('6');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('MONTHLY');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalAmount = selectedDues.reduce((sum, due) => sum + due.outstandingAmount, 0);
  const installmentAmount = numberOfInstallments ? 
    (totalAmount / parseInt(numberOfInstallments)).toFixed(2) : '0.00';

  const handleSubmit = async () => {
    if (selectedDues.length === 0) {
      toast.error('Please select at least one due item');
      return;
    }

    if (!numberOfInstallments || parseInt(numberOfInstallments) < 1) {
      toast.error('Please enter a valid number of installments');
      return;
    }

    setSubmitting(true);
    try {
      const items: CreateArrangementItemRequest[] = selectedDues.map(due => ({
        sourceModule: due.sourceModule,
        sourceType: due.sourceType,
        sourceReferenceId: due.sourceReferenceId,
        sourceDescription: due.description,
        originalOutstandingAmount: due.outstandingAmount,
        arrangedAmount: due.outstandingAmount
      }));

      const request: CreateArrangementRequest = {
        employerId,
        arrangementSourceModule: sourceModule,
        arrangementType,
        startDate,
        notes,
        items,
        scheduleType,
        numberOfInstallments: parseInt(numberOfInstallments),
        frequency
      };

      const arrangement = await centralPaymentArrangementService.createArrangement(request);
      toast.success('Payment arrangement created successfully');
      onArrangementCreated(arrangement.id);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating arrangement:', error);
      toast.error(error.message || 'Failed to create payment arrangement');
    } finally {
      setSubmitting(false);
    }
  };

  const removeDue = (dueIndex: number) => {
    setSelectedDues(selectedDues.filter((_, index) => index !== dueIndex));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment Arrangement - {employerName}</DialogTitle>
        </DialogHeader>

        <Tabs value={`step${step}`} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="step1" onClick={() => setStep(1)}>
              <FileText className="h-4 w-4 mr-2" />
              Select Dues
            </TabsTrigger>
            <TabsTrigger value="step2" onClick={() => setStep(2)} disabled={selectedDues.length === 0}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="step3" onClick={() => setStep(3)} disabled={selectedDues.length === 0}>
              <DollarSign className="h-4 w-4 mr-2" />
              Review
            </TabsTrigger>
          </TabsList>

          {/* Step 1: Select Dues */}
          <TabsContent value="step1" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Arrangement Type</Label>
                <Select value={arrangementType} onValueChange={(v) => setArrangementType(v as ArrangementType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ArrangementType.VOLUNTARY_PLAN}>Voluntary Plan</SelectItem>
                    <SelectItem value={ArrangementType.COURT_ORDERED_PLAN}>Court Ordered Plan</SelectItem>
                    <SelectItem value={ArrangementType.NEGOTIATED_PLAN}>Negotiated Plan</SelectItem>
                    <SelectItem value={ArrangementType.ADMINISTRATIVE_PLAN}>Administrative Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-3">Selected Dues</h3>
                {selectedDues.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <p>No dues selected</p>
                    <p className="text-sm">Pre-selected dues will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedDues.map((due, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">{due.sourceModule}</Badge>
                          </TableCell>
                          <TableCell>{due.sourceType.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="max-w-xs truncate">{due.description}</TableCell>
                          <TableCell className="text-right font-mono">
                            ${due.outstandingAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeDue(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold font-mono">
                          ${totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={selectedDues.length === 0}>
                  Next: Configure Schedule
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Step 2: Configure Schedule */}
          <TabsContent value="step2" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Frequency</Label>
                <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Installments</Label>
                <Input
                  type="number"
                  min="1"
                  value={numberOfInstallments}
                  onChange={(e) => setNumberOfInstallments(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Installment Amount (Calculated)</Label>
                <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
                  <span className="font-mono">${installmentAmount}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-muted">
              <h4 className="font-medium mb-2">Schedule Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="ml-2 font-mono font-bold">${totalAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Installments:</span>
                  <span className="ml-2 font-bold">{numberOfInstallments}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Per Installment:</span>
                  <span className="ml-2 font-mono font-bold">${installmentAmount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Frequency:</span>
                  <span className="ml-2 font-bold">{frequency}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next: Review
              </Button>
            </div>
          </TabsContent>

          {/* Step 3: Review & Submit */}
          <TabsContent value="step3" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="Add any notes about this arrangement..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Arrangement Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Employer:</span>
                    <span className="ml-2 font-medium">{employerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-medium">{arrangementType.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source Module:</span>
                    <span className="ml-2 font-medium">{sourceModule}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="ml-2 font-medium">{startDate}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Due Items:</span>
                    <span className="ml-2 font-medium">{selectedDues.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="ml-2 font-mono font-bold">${totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Arrangement'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
