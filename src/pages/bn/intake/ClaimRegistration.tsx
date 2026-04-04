/**
 * Claim Intake Shell — Enhanced with SSN lookup and person preview
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Search, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useBnProducts } from '@/hooks/bn/useBnProduct';
import { useCreateBnClaim } from '@/hooks/bn/useBnClaim';
import { useBnPersonLookup } from '@/hooks/bn/useBnIntegration';
import type { BnProduct } from '@/types/bn';
import { BnDetailRow, BnStatusBadge } from '@/components/bn/shared';
import { formatDateForDisplay } from '@/lib/format-config';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';

export default function ClaimRegistration() {
  const navigate = useNavigate();
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

  const [ssnSearch, setSsnSearch] = useState('');
  const { data: person, isLoading: personLoading } = useBnPersonLookup(ssnSearch);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSsnLookup = () => {
    if (form.ssn.trim()) {
      setSsnSearch(form.ssn.trim());
    }
  };

  const handleSubmit = async () => {
    if (!form.ssn || !form.product_id) {
      toast.error('Please check the form for valid information!', {
        description: 'SSN and Benefit Type are required.',
        classNames: { toast: '!bg-destructive', title: '!text-white', description: '!text-white !opacity-100' },
      });
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
      toast.success(`Claim registered: ${result.claim_number || result.id.slice(0, 8)}`);
      navigate(`/bn/claims/${result.id}`);
    } catch (err: any) {
      toast.error('Failed to register claim', { description: err?.message });
    }
  };

  return (
    <PermissionWrapper moduleName="bn_claims">
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/bn/claims')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Register New Claim</h1>
            <p className="text-sm text-muted-foreground">Create a new benefit application for an insured person</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left — SSN lookup + Claimant preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Claimant Lookup</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SSN <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.ssn}
                      onChange={(e) => updateField('ssn', e.target.value)}
                      placeholder="Enter SSN"
                      maxLength={20}
                    />
                    <Button variant="outline" size="icon" onClick={handleSsnLookup} disabled={personLoading}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Person preview */}
                {personLoading && <p className="text-sm text-muted-foreground">Searching...</p>}
                {person && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{person.fullName}</span>
                      <BnStatusBadge status={person.status.toUpperCase()} size="sm" className="ml-auto" />
                    </div>
                    <BnDetailRow label="DOB" value={formatDateForDisplay(person.dateOfBirth)} />
                    <BnDetailRow label="Gender" value={person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Not-Specified'} />
                    {person.phone && <BnDetailRow label="Phone" value={person.phone} />}
                    <div className="flex items-center gap-1 pt-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs text-emerald-600">Person verified</span>
                    </div>
                  </div>
                )}
                {ssnSearch && !personLoading && !person && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">No person found for SSN {ssnSearch}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Payment Info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <Input value={form.bank_account} onChange={(e) => updateField('bank_account', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Routing Number</Label>
                  <Input value={form.bank_routing_number} onChange={(e) => updateField('bank_routing_number', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right — Claim details */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Claim Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Benefit Type <span className="text-destructive">*</span></Label>
                    <Select value={form.product_id} onValueChange={(v) => updateField('product_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select benefit type" /></SelectTrigger>
                      <SelectContent>
                        {activeProducts.map((p: BnProduct) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.benefit_name} ({p.benefit_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Employer Reg No.</Label>
                    <Input value={form.employer_regno} onChange={(e) => updateField('employer_regno', e.target.value)} placeholder="e.g. ER-001" />
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
                    <Label>Contact Phone</Label>
                    <Input value={form.contact_phone} onChange={(e) => updateField('contact_phone', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input value={form.contact_email} onChange={(e) => updateField('contact_email', e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action bar */}
            <div className="flex justify-end gap-3 rounded-lg border bg-card p-4">
              <Button variant="outline" onClick={() => navigate('/bn/claims')}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createClaim.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {createClaim.isPending ? 'Registering...' : 'Register Claim'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PermissionWrapper>
  );
}
