import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBnProducts, useCreateBnProduct } from '@/hooks/bn/useBnProduct';
import { useCreateBnClaim } from '@/hooks/bn/useBnClaim';
import type { BnProduct } from '@/types/bn';

export default function ClaimRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: products = [] } = useBnProducts();
  const createClaim = useCreateBnClaim();

  const activeProducts = products.filter((p: BnProduct) => p.status === 'ACTIVE');

  const [form, setForm] = useState({
    ssn: '',
    product_id: '',
    employer_regno: '',
    source: 'WALK_IN',
    priority: 'NORMAL',
    contact_phone: '',
    contact_email: '',
    bank_account: '',
    bank_routing_number: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.ssn || !form.product_id) {
      toast({ title: 'Validation Error', description: 'SSN and Benefit Type are required.', variant: 'destructive' });
      return;
    }
    try {
      const result = await createClaim.mutateAsync({
        ssn: form.ssn,
        product_id: form.product_id,
        employer_regno: form.employer_regno || undefined,
        source: form.source,
        priority: form.priority,
        contact_phone: form.contact_phone || undefined,
        contact_email: form.contact_email || undefined,
        bank_account: form.bank_account || undefined,
        bank_routing_number: form.bank_routing_number || undefined,
        status: 'SUBMITTED',
        submission_date: new Date().toISOString(),
      });
      toast({ title: 'Success', description: `Claim registered: ${result.claim_number || result.id.slice(0, 8)}` });
      navigate(`/bn/claims/${result.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to register claim.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/bn/claims')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Register New Claim</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter claim details for a new benefit application</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left - Claimant Info */}
        <Card>
          <CardHeader><CardTitle>Claimant Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>SSN *</Label>
              <Input value={form.ssn} onChange={(e) => updateField('ssn', e.target.value)} placeholder="Enter insured person SSN" maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label>Employer Registration No.</Label>
              <Input value={form.employer_regno} onChange={(e) => updateField('employer_regno', e.target.value)} placeholder="e.g. ER-001" />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={form.contact_phone} onChange={(e) => updateField('contact_phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input value={form.contact_email} onChange={(e) => updateField('contact_email', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Right - Claim Details */}
        <Card>
          <CardHeader><CardTitle>Claim Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Benefit Type *</Label>
              <Select value={form.product_id} onValueChange={(v) => updateField('product_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select benefit type" /></SelectTrigger>
                <SelectContent>
                  {activeProducts.map((p: BnProduct) => (
                    <SelectItem key={p.id} value={p.id}>{p.benefit_name} ({p.benefit_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeProducts.length === 0 && (
                <p className="text-xs text-destructive">No active benefit products. Configure products first.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => updateField('source', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk-in</SelectItem>
                  <SelectItem value="PAPER">Paper Application</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => updateField('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Input value={form.bank_account} onChange={(e) => updateField('bank_account', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bank Routing Number</Label>
              <Input value={form.bank_routing_number} onChange={(e) => updateField('bank_routing_number', e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/bn/claims')}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={createClaim.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {createClaim.isPending ? 'Registering...' : 'Register Claim'}
        </Button>
      </div>
    </div>
  );
}
