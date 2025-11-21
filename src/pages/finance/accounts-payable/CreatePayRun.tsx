import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { createPayRun, calculateGLSummary } from '@/services/benefitPayRunService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { BenefitPayRunDetail } from '@/types/longTermBenefits';

export default function CreatePayRun() {
  const [step, setStep] = useState(1);
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(12);
  const [payDate, setPayDate] = useState('2025-12-31');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['AGE', 'INVALIDITY']);
  const [excludeSuspended, setExcludeSuspended] = useState(true);
  const [includeOverride, setIncludeOverride] = useState(false);
  const [payOffice, setPayOffice] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [previewDetails, setPreviewDetails] = useState<BenefitPayRunDetail[]>([]);
  const [payRunId, setPayRunId] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleToggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handlePreview = () => {
    const result = createPayRun(year, month, payDate, selectedTypes, {
      payOffice: payOffice === 'ALL' ? undefined : payOffice,
      paymentMethod: paymentMethod === 'ALL' ? undefined : paymentMethod,
      excludeSuspended,
      includeOverride
    });
    setPayRunId(result.payRun.id);
    setPreviewDetails(result.details);
    setStep(2);
  };

  const handleToggleInclude = (id: string) => {
    setPreviewDetails(prev =>
      prev.map(d => d.id === id ? { ...d, included: !d.included } : d)
    );
  };

  const handleViewGL = () => {
    setStep(3);
  };

  const handleSubmit = () => {
    toast({ title: 'Pay Run Created', description: `Pay Run ${payRunId} submitted for approval` });
    navigate('/finance/accounts-payable/pay-runs');
  };

  const totalGross = previewDetails.filter(d => d.included).reduce((sum, d) => sum + d.grossAmount, 0);
  const totalNet = previewDetails.filter(d => d.included).reduce((sum, d) => sum + d.netAmount, 0);
  const glSummary = payRunId ? calculateGLSummary(payRunId) : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Benefit Pay Run</h1>
        <p className="text-muted-foreground mt-1">
          Monthly payment processing for long-term benefits
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="font-medium">Parameters</span>
        </div>
        <ArrowRight className="text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className="font-medium">Preview</span>
        </div>
        <ArrowRight className="text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className="font-medium">GL Summary</span>
        </div>
      </div>

      {/* Step 1: Parameters */}
      {step === 1 && (
        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} />
            </div>
            <div>
              <Label>Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2025, i).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pay Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Benefit Types to Include</Label>
            <div className="grid grid-cols-4 gap-4 mt-2">
              {['AGE', 'INVALIDITY', 'ASSISTANCE', 'SURVIVORS'].map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={() => handleToggleType(type)}
                  />
                  <label className="text-sm">{type}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Pay Office</Label>
              <Select value={payOffice} onValueChange={setPayOffice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Offices</SelectItem>
                  <SelectItem value="ST_KITTS">St Kitts</SelectItem>
                  <SelectItem value="NEVIS">Nevis</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Methods</SelectItem>
                  <SelectItem value="EFT">EFT</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox checked={excludeSuspended} onCheckedChange={(v) => setExcludeSuspended(!!v)} />
              <label className="text-sm">Exclude beneficiaries with invalid life certificate status</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={includeOverride} onCheckedChange={(v) => setIncludeOverride(!!v)} />
              <label className="text-sm">Include suspended with override (requires proper role)</label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handlePreview} disabled={selectedTypes.length === 0}>
              Preview Beneficiaries
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Preview Beneficiaries</h2>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Beneficiaries: {previewDetails.filter(d => d.included).length}</p>
              <p className="text-lg font-bold">Total Net: XCD ${totalNet.toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Include?</TableHead>
                  <TableHead>Beneficiary ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>SSN</TableHead>
                  <TableHead>Benefit Type</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Life Cert Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>
                      <Checkbox
                        checked={detail.included}
                        onCheckedChange={() => handleToggleInclude(detail.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{detail.beneficiaryId}</TableCell>
                    <TableCell>{detail.insuredPersonName}</TableCell>
                    <TableCell>{detail.insuredPersonSSN}</TableCell>
                    <TableCell>{detail.benefitType}</TableCell>
                    <TableCell className="text-right">XCD ${detail.grossAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">XCD ${detail.netAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge>{detail.lifeCertificateStatus.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{detail.beneficiaryStatus.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell>{detail.paymentMethod}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleViewGL}>
              View GL Summary
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: GL Summary */}
      {step === 3 && glSummary && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">GL Summary</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">By Benefit Type (Debit - Expense)</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Benefit Type</TableHead>
                      <TableHead>GL Expense Account</TableHead>
                      <TableHead className="text-right">Amount (XCD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {glSummary.byBenefitType.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.benefitType}</TableCell>
                        <TableCell>{item.glExpenseAccount}</TableCell>
                        <TableCell className="text-right">${item.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold">
                      <TableCell colSpan={2}>Total Debits</TableCell>
                      <TableCell className="text-right">
                        ${glSummary.byBenefitType.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">AP Control (Credit)</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AP Control Account</TableHead>
                      <TableHead className="text-right">Total Credits (XCD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">{glSummary.apControl.apControlAccount}</TableCell>
                      <TableCell className="text-right font-bold">
                        ${glSummary.apControl.totalCredits.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm font-medium">
                ✓ Totals Balance: Debits = Credits = XCD ${glSummary.apControl.totalCredits.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={handleSubmit}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit Pay Run
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
