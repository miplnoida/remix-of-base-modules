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
import { Search, FileText, DollarSign, Send, RefreshCw, Info, Upload, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { InsuredPerson, ServiceType, FeeConfiguration, Invoice } from '@/types/serviceRequest';
import {
  searchInsuredPersons, getServiceCategories, getServiceTypesByCategory, getPriorities,
  getFeeByServiceType, generateInvoice, createServiceRequest, getServiceTypeById
} from '@/services/serviceRequestService';
import { initializeSeedData, resetSeedData } from '@/services/mockData/seedData';
import { InvoiceStub } from '@/components/invoices/InvoiceStub';

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
  const [queueToken, setQueueToken] = useState('');
  const [editablePhone, setEditablePhone] = useState('');
  const [editableEmail, setEditableEmail] = useState('');
  const [feeConfig, setFeeConfig] = useState<FeeConfiguration | null>(null);
  const [additionalFee, setAdditionalFee] = useState(0);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [currentServiceRequestId, setCurrentServiceRequestId] = useState('');

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
  };

  useEffect(() => {
    if (serviceCategoryId) {
      const types = getServiceTypesByCategory(serviceCategoryId);
      setServiceTypes(types);
      setServiceTypeId('');
    }
  }, [serviceCategoryId]);

  useEffect(() => {
    if (serviceTypeId) {
      const fee = getFeeByServiceType(serviceTypeId);
      if (fee) setFeeConfig(fee);
      else { setFeeConfig(null); }
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
      queueTokenId: queueToken || undefined,
      processingUnitId: selectedType?.defaultProcessingUnitId || 'UNIT001',
      status: selectedType?.requiresVerification ? 'Draft' : 'Invoice Generated',
      internalNotes,
      attachments: attachmentData,
      verificationRequired: selectedType?.requiresVerification,
      verificationStatus: selectedType?.requiresVerification ? 'Pending' : undefined,
      createdBy: 'SYSTEM_USER',
    });

    setCurrentServiceRequestId(request.id);

    if (selectedType?.requiresVerification) {
      toast.success('Service request submitted for verification.');
      setTimeout(() => navigate('/person/service-requests/pending-verification'), 2000);
      return;
    }

    // Handle zero-cost services
    const feeAmount = feeConfig?.amount || 0;
    const totalAmount = feeAmount + additionalFee;
    
    const invoice = generateInvoice(
      request.id, 
      selectedPerson.id, 
      feeAmount, 
      additionalFee, 
      feeConfig?.accountingHeadCode || 'MISC'
    );
    
    setCurrentInvoice(invoice);
    setInvoiceGenerated(true);
    
    if (totalAmount === 0) {
      toast.success(`Service request processed (No fee). Invoice ${invoice.invoiceNumber} generated for records.`);
    } else {
      toast.success(`Invoice ${invoice.invoiceNumber} generated for EC$ ${totalAmount.toFixed(2)}. Proceed to cashier.`);
    }
  };

  const totalAmount = (feeConfig?.amount || 0) + additionalFee;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader 
        title="New Service Request" 
        subtitle="Create service request for insured person"
        actions={
          <Button variant="outline" onClick={() => { resetSeedData(); toast.success('Data reset'); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Demo Data
          </Button>
        } 
      />

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Demo Mode:</strong> Try searching: <strong>John Doe</strong>, <strong>Jane Smith</strong>, or <strong>Michael Johnson</strong>
        </AlertDescription>
      </Alert>

      {/* Invoice Stub Display */}
      {invoiceGenerated && currentInvoice && selectedPerson && (
        <InvoiceStub 
          invoice={currentInvoice}
          insuredPerson={selectedPerson}
          serviceType={getServiceTypeById(serviceTypeId)!}
          serviceRequestId={currentServiceRequestId}
          queueToken={queueToken}
        />
      )}

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Insured Person Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Enter SSN, Name, or ID..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
              className="flex-1" 
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y">
              {searchResults.map((person) => (
                <div 
                  key={person.id} 
                  className="p-3 hover:bg-muted cursor-pointer" 
                  onClick={() => handleSelectPerson(person)}
                >
                  <div className="font-medium">{person.fullName}</div>
                  <div className="text-sm text-muted-foreground">SSN: {person.ssn}</div>
                </div>
              ))}
            </div>
          )}

          {selectedPerson && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="font-semibold text-lg">{selectedPerson.fullName}</h3>
              <p className="text-sm text-muted-foreground">SSN: {selectedPerson.ssn}</p>
              <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={editablePhone} onChange={(e) => setEditablePhone(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editableEmail} onChange={(e) => setEditableEmail(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Details Forms */}
      {selectedPerson && !invoiceGenerated && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <FileText className="h-5 w-5 inline mr-2" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Service Category *</Label>
                  <Select value={serviceCategoryId} onValueChange={setServiceCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Service Type *</Label>
                  <Select value={serviceTypeId} onValueChange={setServiceTypeId} disabled={!serviceCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.requiresVerification && ' (Requires Verification)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={priorityId} onValueChange={setPriorityId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Source</Label>
                  <Input value="COUNTER" disabled className="bg-muted" />
                </div>

                <div className="col-span-2">
                  <Label>Queue Token (Optional)</Label>
                  <div className="flex gap-2">
                    <Ticket className="h-4 w-4 text-muted-foreground mt-3" />
                    <Input 
                      value={queueToken} 
                      onChange={(e) => setQueueToken(e.target.value)}
                      placeholder="Enter queue token if applicable (e.g., Q-001)"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Associate this request with a queue management token
                  </p>
                </div>
              </div>

              <div>
                <Label>Reason for Request *</Label>
                <Textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  rows={3}
                  placeholder="Describe the reason for this service request..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Upload className="h-5 w-5 inline mr-2" />
                Documents & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Upload Documents</Label>
                <Input type="file" multiple onChange={handleFileUpload} />
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((f, i) => (
                      <div key={i} className="flex justify-between items-center bg-muted p-2 rounded text-sm">
                        <span>{f.name} ({(f.size / 1024).toFixed(2)} KB)</span>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(i)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Internal Notes (Optional)</Label>
                <Textarea 
                  value={internalNotes} 
                  onChange={(e) => setInternalNotes(e.target.value)} 
                  rows={3}
                  placeholder="Add any internal notes or special instructions..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <DollarSign className="h-5 w-5 inline mr-2" />
                Fee Information
              </CardTitle>
              <CardDescription>Automatically calculated based on service type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base Fee (EC$)</Label>
                  <Input 
                    value={feeConfig ? feeConfig.amount.toFixed(2) : '0.00'} 
                    disabled 
                    className="bg-muted font-semibold text-lg" 
                  />
                  {feeConfig?.amount === 0 && (
                    <p className="text-xs text-green-600 font-medium mt-1">Free Service</p>
                  )}
                </div>

                <div>
                  <Label>Additional Fee (EC$)</Label>
                  <Input 
                    type="number" 
                    value={additionalFee} 
                    onChange={(e) => setAdditionalFee(parseFloat(e.target.value) || 0)} 
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <Label>Total Amount (EC$)</Label>
                  <Input 
                    value={totalAmount.toFixed(2)} 
                    disabled 
                    className="bg-primary/10 font-bold text-xl" 
                  />
                </div>

                <div>
                  <Label>Accounting Head</Label>
                  <Input 
                    value={feeConfig?.accountingHeadName || 'N/A'} 
                    disabled 
                    className="bg-muted text-sm" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/person/service-requests')}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedPerson || !serviceTypeId || !reason.trim()} 
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Service Request
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
