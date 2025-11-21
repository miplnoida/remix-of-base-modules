import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, FileText, CheckCircle } from 'lucide-react';
import { getBeneficiaryById, getLifeCertificatesByBeneficiary, recordLifeCertificate } from '@/services/longTermBeneficiaryService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function BeneficiaryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const beneficiary = getBeneficiaryById(id!);
  const lifeCertificates = getLifeCertificatesByBeneficiary(id!);
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [lifeCertForm, setLifeCertForm] = useState({
    receivedDate: new Date().toISOString().split('T')[0],
    method: 'IN_PERSON' as const,
    outcome: 'ALIVE' as const,
    notes: ''
  });

  if (!beneficiary) {
    return (
      <div className="p-6">
        <p>Beneficiary not found</p>
      </div>
    );
  }

  const handleRecordCertificate = () => {
    recordLifeCertificate({
      beneficiaryId: id!,
      ...lifeCertForm,
      recordedBy: 'CURRENT_USER'
    });
    toast({ title: 'Life certificate recorded successfully' });
    setIsRecordDialogOpen(false);
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/nbenefit/long-term/registry')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Registry
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{beneficiary.insuredPersonName}</h1>
        <p className="text-muted-foreground mt-1">
          SSN: {beneficiary.insuredPersonSSN} | Beneficiary ID: {beneficiary.id}
        </p>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="payment">Payment Settings</TabsTrigger>
          <TabsTrigger value="lifecycle">Life Certificate</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Beneficiary Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Benefit Type</p>
                <p className="font-medium">{beneficiary.primaryBenefitType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{beneficiary.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{beneficiary.startDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Amount</p>
                <p className="font-medium">XCD ${beneficiary.monthlyBenefitAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pay Office</p>
                <p className="font-medium">{beneficiary.payOffice.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Benefit Award ID</p>
                <p className="font-medium">{beneficiary.benefitAwardId}</p>
              </div>
              {beneficiary.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{beneficiary.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Settings</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">{beneficiary.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Frequency</p>
                <p className="font-medium">{beneficiary.paymentFrequency}</p>
              </div>
              {beneficiary.paymentMethod === 'EFT' && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{beneficiary.bankName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-medium">{beneficiary.bankAccountNumber || 'N/A'}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Last Payment Date</p>
                <p className="font-medium">{beneficiary.lastPaymentDate || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Payment Due</p>
                <p className="font-medium">{beneficiary.nextPaymentDueDate}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Life Certificate Status</h2>
              <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Record Certificate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Life Certificate</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Received Date</Label>
                      <Input
                        type="date"
                        value={lifeCertForm.receivedDate}
                        onChange={(e) => setLifeCertForm({ ...lifeCertForm, receivedDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Method</Label>
                      <Select
                        value={lifeCertForm.method}
                        onValueChange={(value: any) => setLifeCertForm({ ...lifeCertForm, method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IN_PERSON">In Person</SelectItem>
                          <SelectItem value="POSTAL">Postal</SelectItem>
                          <SelectItem value="SCANNED">Scanned Document</SelectItem>
                          <SelectItem value="EMAIL">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Outcome</Label>
                      <Select
                        value={lifeCertForm.outcome}
                        onValueChange={(value: any) => setLifeCertForm({ ...lifeCertForm, outcome: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALIVE">Alive</SelectItem>
                          <SelectItem value="DECEASED">Deceased</SelectItem>
                          <SelectItem value="UNCONFIRMED">Unconfirmed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={lifeCertForm.notes}
                        onChange={(e) => setLifeCertForm({ ...lifeCertForm, notes: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleRecordCertificate} className="w-full">
                      Save Certificate
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <Badge>{beneficiary.lifeCertificateStatus.replace(/_/g, ' ')}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Received</p>
                <p className="font-medium">{beneficiary.lifeCertificateLastReceivedDate || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Due Date</p>
                <p className="font-medium">{beneficiary.lifeCertificateNextDueDate || 'N/A'}</p>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mb-2">History</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Received</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lifeCertificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>{cert.receivedDate}</TableCell>
                      <TableCell>{cert.method.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Badge>{cert.outcome}</Badge>
                      </TableCell>
                      <TableCell>{cert.recordedBy}</TableCell>
                      <TableCell>{cert.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Payment History</h2>
            <p className="text-muted-foreground">Payment history will be displayed here</p>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Audit Trail</h2>
            <div className="space-y-2">
              <div className="border-l-2 pl-4 py-2">
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(beneficiary.createdAt).toLocaleString()} by {beneficiary.createdBy}
                </p>
              </div>
              {beneficiary.updatedAt && (
                <div className="border-l-2 pl-4 py-2">
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(beneficiary.updatedAt).toLocaleString()} by {beneficiary.updatedBy}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
