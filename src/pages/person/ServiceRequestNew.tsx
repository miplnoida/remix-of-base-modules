import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, FileText, DollarSign, Save, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  ServiceRequest,
  InsuredPerson,
  ServiceCategory,
  ServiceType,
  FeeConfiguration,
} from '@/types/serviceRequest';
import {
  searchInsuredPersons,
  getInsuredPersonById,
  getServiceCategories,
  getServiceTypesByCategory,
  getPriorities,
  getProcessingUnits,
  getOfficers,
  getFeeByServiceType,
  generateInvoice,
  createServiceRequest,
  updateServiceRequestStatus,
  updateInvoiceStatus,
} from '@/services/serviceRequestService';

export default function ServiceRequestNew() {
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InsuredPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<InsuredPerson | null>(null);

  // Master data
  const [categories] = useState(getServiceCategories());
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [priorities] = useState(getPriorities());
  const [processingUnits] = useState(getProcessingUnits());
  const [officers] = useState(getOfficers());

  // Form state
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [reason, setReason] = useState('');
  const [priorityId, setPriorityId] = useState('PRI001'); // Default: Normal
  const [processingUnitId, setProcessingUnitId] = useState('');
  const [assignedOfficerId, setAssignedOfficerId] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Contact edit state
  const [editablePhone, setEditablePhone] = useState('');
  const [editableEmail, setEditableEmail] = useState('');

  // Fee & Invoice state
  const [feeConfig, setFeeConfig] = useState<FeeConfiguration | null>(null);
  const [additionalFee, setAdditionalFee] = useState(0);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [currentInvoiceId, setCurrentInvoiceId] = useState('');
  const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState('');
  const [currentRequestId, setCurrentRequestId] = useState('');
  const [requestStatus, setRequestStatus] = useState<string>('Draft');

  // Handle insured person search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }
    const results = searchInsuredPersons(searchQuery);
    setSearchResults(results);
    if (results.length === 0) {
      toast.info('No results found');
    }
  };

  const handleSelectPerson = (person: InsuredPerson) => {
    setSelectedPerson(person);
    setEditablePhone(person.contactPhone);
    setEditableEmail(person.email);
    setSearchResults([]);
    setSearchQuery('');
    toast.success(`Selected: ${person.fullName}`);
  };

  // Handle service category change
  useEffect(() => {
    if (serviceCategoryId) {
      const types = getServiceTypesByCategory(serviceCategoryId);
      setServiceTypes(types);
      setServiceTypeId('');
      setFeeConfig(null);
      setProcessingUnitId('');
    }
  }, [serviceCategoryId]);

  // Handle service type change
  useEffect(() => {
    if (serviceTypeId) {
      const types = getServiceTypesByCategory(serviceCategoryId);
      const selectedType = types.find(t => t.id === serviceTypeId);
      if (selectedType?.defaultProcessingUnitId) {
        setProcessingUnitId(selectedType.defaultProcessingUnitId);
      }
    }
  }, [serviceTypeId, serviceCategoryId]);

  // Fetch fee configuration
  const handleFetchFee = () => {
    if (!serviceTypeId) {
      toast.error('Please select a service type first');
      return;
    }
    const fee = getFeeByServiceType(serviceTypeId);
    if (fee) {
      setFeeConfig(fee);
      toast.success(`Fee loaded: EC$${fee.amount.toFixed(2)}`);
    } else {
      toast.error('No fee configuration found for this service');
    }
  };

  // Generate invoice
  const handleGenerateInvoice = () => {
    if (!selectedPerson) {
      toast.error('Please select an insured person');
      return;
    }
    if (!serviceTypeId) {
      toast.error('Please select a service type');
      return;
    }
    if (!feeConfig) {
      toast.error('Please fetch the fee first');
      return;
    }

    // Create service request first (if not already created)
    let requestId = currentRequestId;
    if (!requestId) {
      const request = createServiceRequest({
        insuredPersonId: selectedPerson.id,
        serviceCategoryId,
        serviceTypeId,
        reason,
        priorityId,
        source: 'COUNTER',
        processingUnitId,
        assignedOfficerId: assignedOfficerId || undefined,
        status: 'Draft',
        internalNotes,
        createdBy: 'SYSTEM_USER', // In real app, get from auth context
      });
      requestId = request.id;
      setCurrentRequestId(requestId);
    }

    // Generate invoice
    const invoice = generateInvoice(
      requestId,
      selectedPerson.id,
      feeConfig.amount,
      additionalFee,
      feeConfig.accountingHeadCode
    );

    setCurrentInvoiceId(invoice.id);
    setCurrentInvoiceNumber(invoice.invoiceNumber);
    setInvoiceGenerated(true);
    setRequestStatus('Invoice Generated');
    
    // Update request status
    updateServiceRequestStatus(requestId, 'Invoice Generated');

    toast.success(`Invoice generated: ${invoice.invoiceNumber}`);
  };

  // Simulate payment
  const handleSimulatePayment = () => {
    if (!currentInvoiceId) {
      toast.error('No invoice to mark as paid');
      return;
    }

    updateInvoiceStatus(currentInvoiceId, 'Paid');
    updateServiceRequestStatus(currentRequestId, 'Payment Received');
    setRequestStatus('Payment Received');
    toast.success('Payment received! Service request ready for processing.');
  };

  // Forward to processing
  const handleForwardToProcessing = () => {
    if (requestStatus !== 'Payment Received') {
      toast.error('Payment must be received before forwarding');
      return;
    }
    if (!processingUnitId) {
      toast.error('Please select a processing unit');
      return;
    }

    updateServiceRequestStatus(currentRequestId, 'Under Review');
    setRequestStatus('Under Review');
    toast.success('Service request forwarded to processing unit');
  };

  // Save as draft
  const handleSaveDraft = () => {
    if (!selectedPerson) {
      toast.error('Please select an insured person');
      return;
    }
    if (!serviceTypeId) {
      toast.error('Please select a service type');
      return;
    }

    if (currentRequestId) {
      toast.info('Request already saved');
      return;
    }

    const request = createServiceRequest({
      insuredPersonId: selectedPerson.id,
      serviceCategoryId,
      serviceTypeId,
      reason,
      priorityId,
      source: 'COUNTER',
      processingUnitId: processingUnitId || 'UNIT005',
      assignedOfficerId: assignedOfficerId || undefined,
      status: 'Draft',
      internalNotes,
      createdBy: 'SYSTEM_USER',
    });

    setCurrentRequestId(request.id);
    toast.success('Service request saved as draft');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="New Service Request"
        subtitle="Create a new service request for an insured person at the counter"
        breadcrumbs={[
          { label: 'Insured Persons', href: '/person/ip-management' },
          { label: 'Service Requests', href: '/person/service-requests' },
          { label: 'New Request' },
        ]}
      />

      {/* Insured Person Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Insured Person Search
          </CardTitle>
          <CardDescription>
            Search by SSN, Name, or Insured Person ID
          </CardDescription>
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
                  className="p-3 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleSelectPerson(person)}
                >
                  <div className="font-medium">{person.fullName}</div>
                  <div className="text-sm text-muted-foreground">
                    SSN: {person.ssn} | ID: {person.id} | DOB: {person.dateOfBirth}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedPerson && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-lg">{selectedPerson.fullName}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Insured Person ID</Label>
                  <div className="font-medium">{selectedPerson.id}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">SSN</Label>
                  <div className="font-medium">{selectedPerson.ssn}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date of Birth</Label>
                  <div className="font-medium">{selectedPerson.dateOfBirth}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <div className="font-medium">{selectedPerson.address}</div>
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input
                    value={editablePhone}
                    onChange={(e) => setEditablePhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={editableEmail}
                    onChange={(e) => setEditableEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Request Details */}
      {selectedPerson && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Service Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Service Category *</Label>
                  <Select value={serviceCategoryId} onValueChange={setServiceCategoryId}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="serviceType">Service Type *</Label>
                  <Select
                    value={serviceTypeId}
                    onValueChange={setServiceTypeId}
                    disabled={!serviceCategoryId}
                  >
                    <SelectTrigger id="serviceType">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority *</Label>
                  <Select value={priorityId} onValueChange={setPriorityId}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((pri) => (
                        <SelectItem key={pri.id} value={pri.id}>
                          {pri.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Source</Label>
                  <Input value="COUNTER" disabled className="bg-muted" />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Reason / Description *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the reason for this service request..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fee & Invoice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fee & Invoice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleFetchFee} variant="outline" disabled={!serviceTypeId}>
                Fetch Fee
              </Button>

              {feeConfig && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Base Fee</Label>
                      <div className="text-2xl font-bold">EC${feeConfig.amount.toFixed(2)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Additional Fee</Label>
                      <Input
                        type="number"
                        value={additionalFee}
                        onChange={(e) => setAdditionalFee(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Total Fee</Label>
                      <div className="text-2xl font-bold text-primary">
                        EC${(feeConfig.amount + additionalFee).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Accounting Head</Label>
                      <div className="font-medium">{feeConfig.accountingHeadCode}</div>
                      <div className="text-sm text-muted-foreground">{feeConfig.accountingHeadName}</div>
                    </div>
                  </div>

                  {invoiceGenerated && (
                    <div className="pt-3 border-t">
                      <Label className="text-muted-foreground">Invoice Number</Label>
                      <div className="text-xl font-bold text-green-600">{currentInvoiceNumber}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Status: {requestStatus}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateInvoice}
                      disabled={invoiceGenerated}
                      className="flex-1"
                    >
                      Generate Invoice
                    </Button>
                    <Button
                      onClick={handleSimulatePayment}
                      disabled={!invoiceGenerated || requestStatus === 'Payment Received'}
                      variant="outline"
                      className="flex-1"
                    >
                      Simulate Payment
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow & Routing */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow & Routing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="processingUnit">Processing Unit *</Label>
                  <Select value={processingUnitId} onValueChange={setProcessingUnitId}>
                    <SelectTrigger id="processingUnit">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {processingUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignedOfficer">Assigned Officer (Optional)</Label>
                  <Select value={assignedOfficerId} onValueChange={setAssignedOfficerId}>
                    <SelectTrigger id="assignedOfficer">
                      <SelectValue placeholder="Select officer" />
                    </SelectTrigger>
                    <SelectContent>
                      {officers.map((officer) => (
                        <SelectItem key={officer.id} value={officer.id}>
                          {officer.name} - {officer.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Officer-only notes..."
                  rows={3}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <Label className="text-muted-foreground">Service Status</Label>
                <div className="text-lg font-semibold mt-1">{requestStatus}</div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/person/service-requests')}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                onClick={handleForwardToProcessing}
                disabled={requestStatus !== 'Payment Received'}
              >
                <Send className="h-4 w-4 mr-2" />
                Forward to Processing
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
