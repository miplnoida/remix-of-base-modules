import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, FileText, DollarSign, Send, RefreshCw, Info, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { InsuredPerson, ServiceType, FeeConfiguration } from '@/types/serviceRequest';
import {
  searchInsuredPersons, getServiceCategories, getServiceTypesByCategory, getPriorities,
  getFeeByServiceType, generateInvoice, createServiceRequest
} from '@/services/serviceRequestService';
import { initializeSeedData, resetSeedData } from '@/services/mockData/seedData';

export default function ServiceRequestNew() {
  const navigate = useNavigate();

  useEffect(() => { initializeSeedData(); }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InsuredPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<InsuredPerson | null>(null);
  const [categories] = useState(getServiceCategories());
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [priorities] = useState(getPriorities());
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [reason, setReason] = useState('');
  const [priorityId, setPriorityId] = useState('PRI001');
  const [internalNotes, setInternalNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [editablePhone, setEditablePhone] = useState('');
  const [editableEmail, setEditableEmail] = useState('');
  const [feeConfig, setFeeConfig] = useState<FeeConfiguration | null>(null);
  const [additionalFee, setAdditionalFee] = useState(0);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState('');

  const handleSearch = () => {
    if (!searchQuery.trim()) { toast.error('Please enter a search query'); return; }
    const results = searchInsuredPersons(searchQuery);
    setSearchResults(results);
    if (results.length === 0) toast.info('No results found');
  };

  const handleSelectPerson = (person: InsuredPerson) => {
    setSelectedPerson(person);
    setEditablePhone(person.contactPhone);
    setEditableEmail(person.email);
    setSearchResults([]);
    setSearchQuery('');
    toast.success(`Selected: ${person.fullName}`);
  };

  useEffect(() => {
    if (serviceCategoryId) {
      const types = getServiceTypesByCategory(serviceCategoryId);
      setServiceTypes(types);
      setServiceTypeId('');
      setFeeConfig(null);
    }
  }, [serviceCategoryId]);

  useEffect(() => {
    if (serviceTypeId) {
      const fee = getFeeByServiceType(serviceTypeId);
      if (fee) setFeeConfig(fee);
      else { setFeeConfig(null); toast.error('No fee configuration found'); }
    }
  }, [serviceTypeId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments([...attachments, ...newFiles]);
      toast.success(`${newFiles.length} file(s) added`);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!selectedPerson) { toast.error('Please select an insured person'); return; }
    if (!serviceTypeId) { toast.error('Please select a service type'); return; }
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }

    const types = getServiceTypesByCategory(serviceCategoryId);
    const selectedType = types.find(t => t.id === serviceTypeId);
    
    const attachmentData = attachments.map((file, index) => ({
      id: `ATT-${Date.now()}-${index}`,
      filename: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }));

    const request = createServiceRequest({
      insuredPersonId: selectedPerson.id,
      serviceCategoryId,
      serviceTypeId,
      reason,
      priorityId,
      source: 'COUNTER',
      processingUnitId: selectedType?.defaultProcessingUnitId || 'UNIT001',
      status: selectedType?.requiresVerification ? 'Draft' : 'Invoice Generated',
      internalNotes,
      attachments: attachmentData,
      verificationRequired: selectedType?.requiresVerification,
      verificationStatus: selectedType?.requiresVerification ? 'Pending' : undefined,
      createdBy: 'SYSTEM_USER',
    });

    if (selectedType?.requiresVerification) {
      toast.success('Service request submitted for verification.');
      setTimeout(() => navigate('/person/service-requests/pending-verification'), 2000);
      return;
    }

    if (feeConfig) {
      const invoice = generateInvoice(request.id, selectedPerson.id, feeConfig.amount, additionalFee, feeConfig.accountingHeadCode);
      setCurrentInvoiceNumber(invoice.invoiceNumber);
      setInvoiceGenerated(true);
      toast.success(`Invoice ${invoice.invoiceNumber} generated. Proceed to cashier.`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="New Service Request" subtitle="Create service request for insured person"
        actions={<Button variant="outline" onClick={() => resetSeedData() || toast.success('Data reset')}><RefreshCw className="h-4 w-4 mr-2" />Reset Demo Data</Button>} />

      <Alert className="bg-blue-50 border-blue-200"><Info className="h-4 w-4 text-blue-600" /><AlertDescription className="text-blue-800"><strong>Demo Mode:</strong> Try: <strong>John Doe</strong>, <strong>Jane Smith</strong></AlertDescription></Alert>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Insured Person Search</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2"><Input placeholder="Enter SSN, Name, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1" /><Button onClick={handleSearch}><Search className="h-4 w-4 mr-2" />Search</Button></div>
          {searchResults.length > 0 && (<div className="border rounded-lg divide-y">{searchResults.map((person) => (<div key={person.id} className="p-3 hover:bg-muted cursor-pointer" onClick={() => handleSelectPerson(person)}><div className="font-medium">{person.fullName}</div><div className="text-sm text-muted-foreground">SSN: {person.ssn}</div></div>))}</div>)}
          {selectedPerson && (<div className="bg-primary/5 border border-primary/20 rounded-lg p-4"><h3 className="font-semibold text-lg">{selectedPerson.fullName}</h3><div className="grid grid-cols-2 gap-4 text-sm mt-2"><div><Label>Phone</Label><Input value={editablePhone} onChange={(e) => setEditablePhone(e.target.value)} /></div><div><Label>Email</Label><Input value={editableEmail} onChange={(e) => setEditableEmail(e.target.value)} /></div></div></div>)}
        </CardContent>
      </Card>

      {selectedPerson && (<>
        <Card><CardHeader><CardTitle><FileText className="h-5 w-5 inline mr-2" />Service Details</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><Label>Category *</Label><Select value={serviceCategoryId} onValueChange={setServiceCategoryId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Service Type *</Label><Select value={serviceTypeId} onValueChange={setServiceTypeId} disabled={!serviceCategoryId}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{serviceTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}{t.requiresVerification && ' (Verification)'}</SelectItem>)}</SelectContent></Select></div><div><Label>Priority</Label><Select value={priorityId} onValueChange={setPriorityId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Source</Label><Input value="COUNTER" disabled className="bg-muted" /></div></div><div><Label>Reason *</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></div></CardContent></Card>

        <Card><CardHeader><CardTitle><Upload className="h-5 w-5 inline mr-2" />Documents & Notes</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Upload</Label><Input type="file" multiple onChange={handleFileUpload} />{attachments.length > 0 && <div className="mt-2 space-y-1">{attachments.map((f, i) => <div key={i} className="flex justify-between bg-muted p-2 rounded text-sm"><span>{f.name}</span><Button variant="ghost" size="sm" onClick={() => handleRemoveFile(i)}>Remove</Button></div>)}</div>}</div><div><Label>Notes</Label><Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} /></div></CardContent></Card>

        <Card><CardHeader><CardTitle><DollarSign className="h-5 w-5 inline mr-2" />Fee Info</CardTitle><CardDescription>Auto-calculated</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><Label>Base Fee</Label><Input value={feeConfig ? feeConfig.amount.toFixed(2) : '0.00'} disabled className="bg-muted font-semibold" /></div><div><Label>Additional Fee</Label><Input type="number" value={additionalFee} onChange={(e) => setAdditionalFee(parseFloat(e.target.value) || 0)} step="0.01" /></div><div><Label>Total</Label><Input value={feeConfig ? (feeConfig.amount + additionalFee).toFixed(2) : '0.00'} disabled className="bg-muted font-bold" /></div><div><Label>Accounting Head</Label><Input value={feeConfig?.accountingHeadName || 'N/A'} disabled className="bg-muted text-sm" /></div></div>{invoiceGenerated && <Alert><AlertDescription><strong>Invoice:</strong> {currentInvoiceNumber}<br /><strong>Status:</strong> Pending Payment</AlertDescription></Alert>}</CardContent></Card>

        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => navigate('/person/service-requests')}>Cancel</Button><Button onClick={handleSubmit} disabled={!selectedPerson || !serviceTypeId || !reason.trim() || invoiceGenerated} size="lg"><Send className="h-4 w-4 mr-2" />Submit</Button></div>
      </>)}
    </div>
  );
}
