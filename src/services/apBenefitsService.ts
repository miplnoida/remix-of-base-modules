import { APBatch, APInvoice, APPayment, APBatchStatus } from '@/types/longTermBenefits';

const STORAGE_KEY_BATCHES = 'ap_batches';
const STORAGE_KEY_INVOICES = 'ap_invoices';
const STORAGE_KEY_PAYMENTS = 'ap_payments';

const mockBatches: APBatch[] = [
  {
    id: 'APB-001',
    sourceModule: 'BENEFITS',
    batchType: 'BENEFITS_PAY_RUN',
    batchReference: 'PR-001',
    status: 'POSTED',
    totalAmount: 2150.00,
    createdBy: 'Finance Admin',
    createdAt: '2025-11-17T09:00:00Z',
    postedBy: 'Finance Admin',
    postedAt: '2025-11-17T09:00:00Z'
  }
];

const mockInvoices: APInvoice[] = [
  {
    id: 'AP-001',
    apBatchId: 'APB-001',
    payeeType: 'BENEFICIARY',
    payeeId: 'IP-001',
    payeeName: 'John Williams',
    reference: 'PRD-001',
    amount: 1200.00,
    currency: 'XCD',
    glAccount: '5-100-AGE',
    status: 'PAID',
    createdAt: '2025-11-17T09:00:00Z'
  },
  {
    id: 'AP-002',
    apBatchId: 'APB-001',
    payeeType: 'BENEFICIARY',
    payeeId: 'IP-003',
    payeeName: 'Robert Davis',
    reference: 'PRD-002',
    amount: 950.00,
    currency: 'XCD',
    glAccount: '5-100-INV',
    status: 'PAID',
    createdAt: '2025-11-17T09:00:00Z'
  }
];

const mockPayments: APPayment[] = [
  {
    id: 'PAY-001',
    apInvoiceId: 'AP-001',
    paymentMethod: 'EFT',
    eftBatchId: 'EFT-2025-11-001',
    paymentDate: '2025-11-30',
    printedFlag: false,
    status: 'SENT',
    createdBy: 'Finance Admin',
    createdAt: '2025-11-17T10:00:00Z'
  },
  {
    id: 'PAY-002',
    apInvoiceId: 'AP-002',
    paymentMethod: 'EFT',
    eftBatchId: 'EFT-2025-11-001',
    paymentDate: '2025-11-30',
    printedFlag: false,
    status: 'SENT',
    createdBy: 'Finance Admin',
    createdAt: '2025-11-17T10:00:00Z'
  }
];

export const getAPBatches = (): APBatch[] => {
  const stored = localStorage.getItem(STORAGE_KEY_BATCHES);
  return stored ? JSON.parse(stored) : mockBatches;
};

const saveAPBatches = (batches: APBatch[]) => {
  localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(batches));
};

export const getAPInvoices = (): APInvoice[] => {
  const stored = localStorage.getItem(STORAGE_KEY_INVOICES);
  return stored ? JSON.parse(stored) : mockInvoices;
};

const saveAPInvoices = (invoices: APInvoice[]) => {
  localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
};

export const getAPPayments = (): APPayment[] => {
  const stored = localStorage.getItem(STORAGE_KEY_PAYMENTS);
  return stored ? JSON.parse(stored) : mockPayments;
};

const saveAPPayments = (payments: APPayment[]) => {
  localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
};

export const getAPBatchById = (id: string): APBatch | undefined => {
  return getAPBatches().find(b => b.id === id);
};

export const getInvoicesByBatchId = (batchId: string): APInvoice[] => {
  return getAPInvoices().filter(inv => inv.apBatchId === batchId);
};

export const getPaymentsByInvoiceId = (invoiceId: string): APPayment[] => {
  return getAPPayments().filter(p => p.apInvoiceId === invoiceId);
};

export const createAPBatchFromPayRun = (
  payRunId: string,
  payRunDetails: any[]
): APBatch => {
  const batches = getAPBatches();
  const invoices = getAPInvoices();
  
  const batchId = `APB-${String(batches.length + 1).padStart(3, '0')}`;
  const totalAmount = payRunDetails.reduce((sum, d) => sum + d.netAmount, 0);

  const newBatch: APBatch = {
    id: batchId,
    sourceModule: 'BENEFITS',
    batchType: 'BENEFITS_PAY_RUN',
    batchReference: payRunId,
    status: 'OPEN',
    totalAmount,
    createdBy: 'CURRENT_USER',
    createdAt: new Date().toISOString()
  };

  const newInvoices: APInvoice[] = payRunDetails.map((detail, index) => ({
    id: `AP-${String(invoices.length + index + 1).padStart(3, '0')}`,
    apBatchId: batchId,
    payeeType: 'BENEFICIARY',
    payeeId: detail.insuredPersonId,
    payeeName: detail.insuredPersonName,
    reference: detail.id,
    amount: detail.netAmount,
    currency: 'XCD',
    glAccount: `5-100-${detail.benefitType}`,
    status: 'OPEN',
    createdAt: new Date().toISOString()
  }));

  batches.push(newBatch);
  saveAPBatches(batches);

  invoices.push(...newInvoices);
  saveAPInvoices(invoices);

  return newBatch;
};

export const generatePayments = (
  invoiceIds: string[],
  paymentMethod: 'EFT' | 'CHEQUE',
  paymentDate: string,
  chequeStartNumber?: number
): APPayment[] => {
  const payments = getAPPayments();
  const invoices = getAPInvoices();
  
  const newPayments: APPayment[] = invoiceIds.map((invId, index) => {
    const invoice = invoices.find(i => i.id === invId);
    if (!invoice) return null;

    const payment: APPayment = {
      id: `PAY-${String(payments.length + index + 1).padStart(3, '0')}`,
      apInvoiceId: invId,
      paymentMethod,
      paymentDate,
      printedFlag: false,
      status: 'UNPRINTED',
      createdBy: 'CURRENT_USER',
      createdAt: new Date().toISOString()
    };

    if (paymentMethod === 'CHEQUE' && chequeStartNumber) {
      payment.chequeNumber = String(chequeStartNumber + index).padStart(6, '0');
    } else if (paymentMethod === 'EFT') {
      payment.eftBatchId = `EFT-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(payments.length + 1).padStart(3, '0')}`;
    }

    // Update invoice status
    invoice.status = 'PAID';

    return payment;
  }).filter(p => p !== null) as APPayment[];

  payments.push(...newPayments);
  saveAPPayments(payments);
  saveAPInvoices(invoices);

  return newPayments;
};

export const updateBatchStatus = (id: string, status: APBatchStatus): APBatch | undefined => {
  const batches = getAPBatches();
  const index = batches.findIndex(b => b.id === id);
  if (index !== -1) {
    batches[index].status = status;
    if (status === 'POSTED') {
      batches[index].postedBy = 'CURRENT_USER';
      batches[index].postedAt = new Date().toISOString();
    }
    saveAPBatches(batches);
    return batches[index];
  }
  return undefined;
};
