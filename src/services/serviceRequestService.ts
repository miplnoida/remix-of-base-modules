import { 
  ServiceRequest, 
  Invoice, 
  InsuredPerson,
  ServiceCategory,
  ServiceType,
  Priority,
  ProcessingUnit,
  FeeConfiguration,
  Officer,
  InvoiceStatus,
  ServiceRequestStatus
} from '@/types/serviceRequest';
import { 
  SERVICE_CATEGORIES, 
  SERVICE_TYPES, 
  PRIORITIES, 
  PROCESSING_UNITS,
  OFFICERS 
} from './mockData/masterData';
import { FEE_CONFIGURATIONS } from './mockData/feeConfiguration';
import { INSURED_PERSONS } from './mockData/insuredPersons';

const STORAGE_KEY_REQUESTS = 'service_requests';
const STORAGE_KEY_INVOICES = 'service_invoices';

// Helper to generate IDs
const generateId = (prefix: string) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
};

// Master Data Services
export const getMasterData = () => ({
  categories: SERVICE_CATEGORIES,
  types: SERVICE_TYPES,
  priorities: PRIORITIES,
  units: PROCESSING_UNITS,
  officers: OFFICERS
});

export const getServiceCategories = (): ServiceCategory[] => SERVICE_CATEGORIES;

export const getServiceTypesByCategory = (categoryId: string): ServiceType[] => {
  return SERVICE_TYPES.filter(st => st.categoryId === categoryId);
};

export const getServiceTypeById = (id: string): ServiceType | undefined => {
  return SERVICE_TYPES.find(st => st.id === id);
};

export const getPriorities = (): Priority[] => PRIORITIES;

export const getProcessingUnits = (): ProcessingUnit[] => PROCESSING_UNITS;

export const getOfficers = (): Officer[] => OFFICERS;

// Insured Person Services
export const searchInsuredPersons = (query: string): InsuredPerson[] => {
  const lowerQuery = query.toLowerCase();
  return INSURED_PERSONS.filter(ip => 
    ip.ssn.includes(query) ||
    ip.fullName.toLowerCase().includes(lowerQuery) ||
    ip.id.toLowerCase().includes(lowerQuery)
  );
};

export const getInsuredPersonById = (id: string): InsuredPerson | undefined => {
  return INSURED_PERSONS.find(ip => ip.id === id);
};

// Fee Configuration Services
export const getFeeByServiceType = (serviceTypeId: string): FeeConfiguration | undefined => {
  return FEE_CONFIGURATIONS.find(
    fc => fc.serviceTypeId === serviceTypeId && fc.active
  );
};

// Invoice Services
const getInvoices = (): Invoice[] => {
  const stored = localStorage.getItem(STORAGE_KEY_INVOICES);
  return stored ? JSON.parse(stored) : [];
};

const saveInvoices = (invoices: Invoice[]) => {
  localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
};

export const generateInvoice = (
  serviceRequestId: string,
  insuredPersonId: string,
  baseFee: number,
  additionalFee: number,
  accountingHeadCode: string
): Invoice => {
  const invoices = getInvoices();
  const invoiceNumber = `INV-2025-${String(invoices.length + 1).padStart(6, '0')}`;
  
  const invoice: Invoice = {
    id: generateId('INV'),
    invoiceNumber,
    insuredPersonId,
    serviceRequestId,
    baseFee,
    additionalFee,
    totalAmount: baseFee + additionalFee,
    accountingHeadCode,
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
  
  invoices.push(invoice);
  saveInvoices(invoices);
  return invoice;
};

export const updateInvoiceStatus = (invoiceId: string, status: InvoiceStatus): Invoice | undefined => {
  const invoices = getInvoices();
  const invoice = invoices.find(inv => inv.id === invoiceId);
  
  if (invoice) {
    invoice.status = status;
    if (status === 'Paid') {
      invoice.paidAt = new Date().toISOString();
    }
    saveInvoices(invoices);
  }
  
  return invoice;
};

export const getInvoiceById = (id: string): Invoice | undefined => {
  return getInvoices().find(inv => inv.id === id);
};

// Service Request Services
const getServiceRequests = (): ServiceRequest[] => {
  const stored = localStorage.getItem(STORAGE_KEY_REQUESTS);
  return stored ? JSON.parse(stored) : [];
};

const saveServiceRequests = (requests: ServiceRequest[]) => {
  localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
};

export const createServiceRequest = (data: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>): ServiceRequest => {
  const requests = getServiceRequests();
  
  const request: ServiceRequest = {
    ...data,
    id: generateId('SR'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  requests.push(request);
  saveServiceRequests(requests);
  return request;
};

export const updateServiceRequest = (id: string, updates: Partial<ServiceRequest>): ServiceRequest | undefined => {
  const requests = getServiceRequests();
  const index = requests.findIndex(req => req.id === id);
  
  if (index !== -1) {
    requests[index] = {
      ...requests[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveServiceRequests(requests);
    return requests[index];
  }
  
  return undefined;
};

export const updateServiceRequestStatus = (id: string, status: ServiceRequestStatus): ServiceRequest | undefined => {
  return updateServiceRequest(id, { status });
};

export const getServiceRequestById = (id: string): ServiceRequest | undefined => {
  return getServiceRequests().find(req => req.id === id);
};

export const getAllServiceRequests = (): ServiceRequest[] => {
  return getServiceRequests();
};
