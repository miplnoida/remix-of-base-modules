import { LongTermBeneficiary, LifeCertificateRecord, BeneficiaryStatus, LifeCertificateStatus } from '@/types/longTermBenefits';

const STORAGE_KEY = 'long_term_beneficiaries';
const LIFE_CERT_KEY = 'life_certificates';

// Mock data
const mockBeneficiaries: LongTermBeneficiary[] = [
  {
    id: 'LTB-001',
    insuredPersonId: 'IP-001',
    insuredPersonName: 'John Williams',
    insuredPersonSSN: '123-45-6789',
    primaryBenefitType: 'AGE',
    benefitAwardId: 'BA-001',
    status: 'ACTIVE',
    startDate: '2024-01-01',
    monthlyBenefitAmount: 1200.00,
    paymentFrequency: 'MONTHLY',
    paymentMethod: 'EFT',
    bankAccountNumber: '1234567890',
    bankName: 'First Caribbean Bank',
    payOffice: 'ST_KITTS',
    nextPaymentDueDate: '2025-12-01',
    lastPaymentDate: '2025-11-01',
    lifeCertificateStatus: 'RECEIVED_VALID',
    lifeCertificateLastReceivedDate: '2025-10-15',
    lifeCertificateNextDueDate: '2026-04-15',
    createdAt: '2024-01-01',
    createdBy: 'SYSTEM'
  },
  {
    id: 'LTB-002',
    insuredPersonId: 'IP-002',
    insuredPersonName: 'Mary Johnson',
    insuredPersonSSN: '234-56-7890',
    primaryBenefitType: 'SURVIVORS',
    benefitAwardId: 'BA-002',
    status: 'ACTIVE',
    startDate: '2024-06-01',
    monthlyBenefitAmount: 800.00,
    paymentFrequency: 'MONTHLY',
    paymentMethod: 'CHEQUE',
    payOffice: 'NEVIS',
    nextPaymentDueDate: '2025-12-01',
    lastPaymentDate: '2025-11-01',
    lifeCertificateStatus: 'REQUIRED_PENDING',
    lifeCertificateNextDueDate: '2025-11-30',
    createdAt: '2024-06-01',
    createdBy: 'SYSTEM'
  },
  {
    id: 'LTB-003',
    insuredPersonId: 'IP-003',
    insuredPersonName: 'Robert Davis',
    insuredPersonSSN: '345-67-8901',
    primaryBenefitType: 'INVALIDITY',
    benefitAwardId: 'BA-003',
    status: 'SUSPENDED_NO_LIFE_CERT',
    startDate: '2023-03-01',
    monthlyBenefitAmount: 950.00,
    paymentFrequency: 'MONTHLY',
    paymentMethod: 'EFT',
    bankAccountNumber: '9876543210',
    bankName: 'Bank of Nevis',
    payOffice: 'ST_KITTS',
    nextPaymentDueDate: '2025-12-01',
    lastPaymentDate: '2025-09-01',
    lifeCertificateStatus: 'EXPIRED',
    lifeCertificateLastReceivedDate: '2025-04-01',
    lifeCertificateNextDueDate: '2025-10-01',
    notes: 'Suspended due to missing life certificate',
    createdAt: '2023-03-01',
    createdBy: 'SYSTEM'
  }
];

const mockLifeCertificates: LifeCertificateRecord[] = [
  {
    id: 'LC-001',
    beneficiaryId: 'LTB-001',
    receivedDate: '2025-10-15',
    method: 'IN_PERSON',
    outcome: 'ALIVE',
    recordedBy: 'Officer Jane Smith',
    notes: 'Beneficiary visited office in person'
  }
];

export const getBeneficiaries = (): LongTermBeneficiary[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : mockBeneficiaries;
};

const saveBeneficiaries = (beneficiaries: LongTermBeneficiary[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(beneficiaries));
};

export const getBeneficiaryById = (id: string): LongTermBeneficiary | undefined => {
  return getBeneficiaries().find(b => b.id === id);
};

export const createBeneficiary = (data: Omit<LongTermBeneficiary, 'id' | 'createdAt' | 'createdBy'>): LongTermBeneficiary => {
  const beneficiaries = getBeneficiaries();
  const newBeneficiary: LongTermBeneficiary = {
    ...data,
    id: `LTB-${String(beneficiaries.length + 1).padStart(3, '0')}`,
    createdAt: new Date().toISOString(),
    createdBy: 'CURRENT_USER'
  };
  beneficiaries.push(newBeneficiary);
  saveBeneficiaries(beneficiaries);
  return newBeneficiary;
};

export const updateBeneficiary = (id: string, updates: Partial<LongTermBeneficiary>): LongTermBeneficiary | undefined => {
  const beneficiaries = getBeneficiaries();
  const index = beneficiaries.findIndex(b => b.id === id);
  if (index !== -1) {
    beneficiaries[index] = {
      ...beneficiaries[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: 'CURRENT_USER'
    };
    saveBeneficiaries(beneficiaries);
    return beneficiaries[index];
  }
  return undefined;
};

export const suspendBeneficiary = (id: string, reason: BeneficiaryStatus, notes?: string): LongTermBeneficiary | undefined => {
  return updateBeneficiary(id, { status: reason, notes });
};

export const reactivateBeneficiary = (id: string, notes?: string): LongTermBeneficiary | undefined => {
  return updateBeneficiary(id, { status: 'ACTIVE', notes });
};

// Life Certificate functions
export const getLifeCertificates = (): LifeCertificateRecord[] => {
  const stored = localStorage.getItem(LIFE_CERT_KEY);
  return stored ? JSON.parse(stored) : mockLifeCertificates;
};

const saveLifeCertificates = (certs: LifeCertificateRecord[]) => {
  localStorage.setItem(LIFE_CERT_KEY, JSON.stringify(certs));
};

export const getLifeCertificatesByBeneficiary = (beneficiaryId: string): LifeCertificateRecord[] => {
  return getLifeCertificates().filter(lc => lc.beneficiaryId === beneficiaryId);
};

export const recordLifeCertificate = (data: Omit<LifeCertificateRecord, 'id'>): LifeCertificateRecord => {
  const certs = getLifeCertificates();
  const newCert: LifeCertificateRecord = {
    ...data,
    id: `LC-${String(certs.length + 1).padStart(3, '0')}`
  };
  certs.push(newCert);
  saveLifeCertificates(certs);

  // Update beneficiary life certificate status
  const receivedDate = new Date(data.receivedDate);
  const nextDueDate = new Date(receivedDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 6); // Default 6 months

  updateBeneficiary(data.beneficiaryId, {
    lifeCertificateStatus: data.outcome === 'ALIVE' ? 'RECEIVED_VALID' : 'EXPIRED',
    lifeCertificateLastReceivedDate: data.receivedDate,
    lifeCertificateNextDueDate: nextDueDate.toISOString().split('T')[0]
  });

  return newCert;
};

export const bulkSuspendForMissingCertificate = (beneficiaryIds: string[]): number => {
  let count = 0;
  beneficiaryIds.forEach(id => {
    const result = suspendBeneficiary(id, 'SUSPENDED_NO_LIFE_CERT', 'Suspended due to missing life certificate');
    if (result) count++;
  });
  return count;
};
