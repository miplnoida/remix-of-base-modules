// ============================================
// CENTRAL PAYMENT ARRANGEMENT SERVICE
// Shared across Compliance, Legal, Finance
// ============================================

import {
  PaymentArrangement,
  PaymentArrangementItem,
  PaymentScheduleInstallment,
  PaymentAllocation,
  CreateArrangementRequest,
  ArrangementStatus,
  InstallmentStatus,
  EmployerDuesSummary,
  ArrangementSummary,
  ArrangementSourceModule
} from '@/types/centralPaymentArrangement';

// Mock storage
let mockArrangements: PaymentArrangement[] = [];
let mockAllocations: PaymentAllocation[] = [];

// Generate next arrangement number
function generateArrangementNumber(): string {
  const year = new Date().getFullYear();
  const count = mockArrangements.length + 1;
  return `PA-${year}-${String(count).padStart(4, '0')}`;
}

// Calculate due date based on frequency
function calculateDueDate(startDate: string, periodOffset: number, frequency: string): string {
  const date = new Date(startDate);
  
  switch (frequency) {
    case 'WEEKLY':
      date.setDate(date.getDate() + (periodOffset * 7));
      break;
    case 'BIWEEKLY':
      date.setDate(date.getDate() + (periodOffset * 14));
      break;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + periodOffset);
      break;
    default:
      break;
  }
  
  return date.toISOString().split('T')[0];
}

// Generate installment schedule
function generateInstallments(
  arrangementId: string,
  totalAmount: number,
  request: CreateArrangementRequest
): PaymentScheduleInstallment[] {
  const installments: PaymentScheduleInstallment[] = [];
  
  if (request.scheduleType === 'EQUAL' && request.numberOfInstallments) {
    const installmentAmount = totalAmount / request.numberOfInstallments;
    
    for (let i = 1; i <= request.numberOfInstallments; i++) {
      const dueDate = calculateDueDate(request.startDate, i - 1, request.frequency || 'MONTHLY');
      
      installments.push({
        id: `inst-${arrangementId}-${String(i).padStart(3, '0')}`,
        paymentArrangementId: arrangementId,
        installmentNumber: i,
        dueDate,
        installmentAmount,
        status: InstallmentStatus.PLANNED,
        paidAmount: 0,
        remainingAmount: installmentAmount,
        isCourtOrdered: request.arrangementType === 'COURT_ORDERED_PLAN'
      });
    }
  } else if (request.scheduleType === 'CUSTOM' && request.customInstallments) {
    request.customInstallments.forEach((custom) => {
      installments.push({
        id: `inst-${arrangementId}-${String(custom.installmentNumber).padStart(3, '0')}`,
        paymentArrangementId: arrangementId,
        installmentNumber: custom.installmentNumber,
        dueDate: custom.dueDate,
        installmentAmount: custom.amount,
        status: InstallmentStatus.PLANNED,
        paidAmount: 0,
        remainingAmount: custom.amount,
        isCourtOrdered: request.arrangementType === 'COURT_ORDERED_PLAN'
      });
    });
  }
  
  return installments;
}

class CentralPaymentArrangementService {
  // ============================================
  // Create new payment arrangement
  // ============================================
  async createArrangement(request: CreateArrangementRequest): Promise<PaymentArrangement> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check for existing active arrangement
    const existingActive = mockArrangements.find(
      arr => arr.employerId === request.employerId && arr.status === ArrangementStatus.ACTIVE
    );
    
    if (existingActive) {
      throw new Error('This employer already has an active payment arrangement. Please supersede or complete the existing arrangement first.');
    }
    
    // Calculate version number
    const existingArrangements = mockArrangements.filter(arr => arr.employerId === request.employerId);
    const versionNumber = existingArrangements.length + 1;
    
    // Calculate total arranged amount
    const totalArrangedAmount = request.items.reduce((sum, item) => sum + item.arrangedAmount, 0);
    
    // Create arrangement items
    const items: PaymentArrangementItem[] = request.items.map((item, index) => ({
      id: `item-${Date.now()}-${index}`,
      paymentArrangementId: '', // Will be set below
      sourceModule: item.sourceModule,
      sourceType: item.sourceType,
      sourceReferenceId: item.sourceReferenceId,
      sourceDescription: item.sourceDescription,
      originalOutstandingAmount: item.originalOutstandingAmount,
      arrangedAmount: item.arrangedAmount,
      paidAmount: 0,
      remainingBalance: item.arrangedAmount
    }));
    
    const arrangementId = `arr-${Date.now()}`;
    
    // Update item IDs
    items.forEach(item => item.paymentArrangementId = arrangementId);
    
    // Generate installments
    const installments = generateInstallments(arrangementId, totalArrangedAmount, request);
    
    // Calculate planned end date if not provided
    const plannedEndDate = request.plannedEndDate || 
      (installments.length > 0 ? installments[installments.length - 1].dueDate : undefined);
    
    // Create arrangement
    const newArrangement: PaymentArrangement = {
      id: arrangementId,
      arrangementNumber: generateArrangementNumber(),
      employerId: request.employerId,
      employerName: 'Mock Employer', // In real system, fetch from employer service
      versionNumber,
      status: ArrangementStatus.DRAFT,
      arrangementSourceModule: request.arrangementSourceModule,
      arrangementType: request.arrangementType,
      startDate: request.startDate,
      plannedEndDate,
      totalArrangedAmount,
      totalPaidAmount: 0,
      outstandingBalance: totalArrangedAmount,
      createdByUserId: 'user-current',
      createdByName: 'Current User',
      createdAt: new Date().toISOString(),
      notes: request.notes,
      items,
      installments
    };
    
    mockArrangements.push(newArrangement);
    return newArrangement;
  }
  
  // ============================================
  // Activate arrangement
  // ============================================
  async activateArrangement(arrangementId: string): Promise<PaymentArrangement> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const arrangement = mockArrangements.find(arr => arr.id === arrangementId);
    if (!arrangement) throw new Error('Arrangement not found');
    
    // Check for existing active arrangement
    const existingActive = mockArrangements.find(
      arr => arr.employerId === arrangement.employerId && 
             arr.status === ArrangementStatus.ACTIVE &&
             arr.id !== arrangementId
    );
    
    if (existingActive) {
      throw new Error('Cannot activate: employer already has an active arrangement');
    }
    
    arrangement.status = ArrangementStatus.ACTIVE;
    return arrangement;
  }
  
  // ============================================
  // Get arrangements
  // ============================================
  async getArrangementsByEmployer(employerId: string): Promise<PaymentArrangement[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockArrangements.filter(arr => arr.employerId === employerId);
  }
  
  async getActiveArrangement(employerId: string): Promise<PaymentArrangement | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockArrangements.find(
      arr => arr.employerId === employerId && arr.status === ArrangementStatus.ACTIVE
    ) || null;
  }
  
  async getArrangementById(id: string): Promise<PaymentArrangement | undefined> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockArrangements.find(arr => arr.id === id);
  }
  
  // ============================================
  // Apply payment to installment
  // ============================================
  async applyPaymentToInstallment(
    arrangementId: string,
    installmentId: string,
    amount: number,
    receiptId: string
  ): Promise<PaymentArrangement> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const arrangement = mockArrangements.find(arr => arr.id === arrangementId);
    if (!arrangement) throw new Error('Arrangement not found');
    
    const installment = arrangement.installments.find(inst => inst.id === installmentId);
    if (!installment) throw new Error('Installment not found');
    
    // Create allocation
    const allocation: PaymentAllocation = {
      id: `alloc-${Date.now()}`,
      receiptId,
      paymentScheduleInstallmentId: installmentId,
      allocatedAmount: amount,
      allocationDate: new Date().toISOString()
    };
    
    mockAllocations.push(allocation);
    
    // Update installment
    installment.paidAmount += amount;
    installment.remainingAmount = installment.installmentAmount - installment.paidAmount;
    installment.lastPaymentDate = new Date().toISOString();
    
    if (installment.remainingAmount <= 0) {
      installment.status = InstallmentStatus.PAID;
    } else if (installment.paidAmount > 0) {
      installment.status = InstallmentStatus.PARTIALLY_PAID;
    }
    
    // Update arrangement totals
    arrangement.totalPaidAmount += amount;
    arrangement.outstandingBalance -= amount;
    
    // Check if completed
    const allPaid = arrangement.installments.every(inst => inst.status === InstallmentStatus.PAID);
    if (allPaid && arrangement.outstandingBalance <= 0) {
      arrangement.status = ArrangementStatus.COMPLETED;
    }
    
    return arrangement;
  }
  
  // ============================================
  // Get employer dues summary
  // ============================================
  async getEmployerDuesSummary(employerId: string): Promise<EmployerDuesSummary> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In real system, aggregate from all modules
    // For now, return mock data
    return {
      employerId,
      employerName: 'Mock Employer',
      complianceDues: [],
      legalDues: [],
      financeDues: [],
      benefitsDues: [],
      totalOutstanding: 0
    };
  }
  
  // ============================================
  // Get arrangement summary
  // ============================================
  async getArrangementSummary(): Promise<ArrangementSummary> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const activeArrangements = mockArrangements.filter(arr => arr.status === ArrangementStatus.ACTIVE);
    const completedArrangements = mockArrangements.filter(arr => arr.status === ArrangementStatus.COMPLETED);
    const supersededArrangements = mockArrangements.filter(arr => arr.status === ArrangementStatus.SUPERSEDED);
    
    return {
      totalArrangements: mockArrangements.length,
      activeArrangements: activeArrangements.length,
      completedArrangements: completedArrangements.length,
      supersededArrangements: supersededArrangements.length,
      totalArrangedValue: activeArrangements.reduce((sum, arr) => sum + arr.totalArrangedAmount, 0),
      totalPaidToDate: activeArrangements.reduce((sum, arr) => sum + arr.totalPaidAmount, 0),
      totalOutstanding: activeArrangements.reduce((sum, arr) => sum + arr.outstandingBalance, 0),
      onTimePaymentRate: 95 // Mock
    };
  }
  
  // ============================================
  // Supersede arrangement
  // ============================================
  async supersedeArrangement(arrangementId: string): Promise<PaymentArrangement> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const arrangement = mockArrangements.find(arr => arr.id === arrangementId);
    if (!arrangement) throw new Error('Arrangement not found');
    
    arrangement.status = ArrangementStatus.SUPERSEDED;
    return arrangement;
  }
}

export const centralPaymentArrangementService = new CentralPaymentArrangementService();
