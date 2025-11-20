// ============================================
// PAYMENT ARRANGEMENT SERVICE
// ============================================

import { 
  ComponentPaymentArrangement, 
  CreateArrangementRequest,
  ComponentInstallmentRecord,
  ComponentInstallmentBreakdown
} from '@/types/paymentArrangement';
import { ContributionComponent, COMPONENT_LABELS } from '@/types/contributionComponents';

// Mock storage
let mockArrangements: ComponentPaymentArrangement[] = [
  {
    id: 'ARR-001',
    arrangementNumber: 'PA-2024-001',
    caseId: 'CASE-001',
    employerId: 'EMP-001',
    employerName: 'Caribbean Hotels Ltd',
    componentBreakdown: [
      { component: ContributionComponent.SSC, principalAmount: 4166.67, penaltyAmount: 0, interestAmount: 83.33, totalAmount: 4250.00 },
      { component: ContributionComponent.SSF, principalAmount: 0, penaltyAmount: 1250.00, interestAmount: 0, totalAmount: 1250.00 },
      { component: ContributionComponent.LVC, principalAmount: 2800.00, penaltyAmount: 0, interestAmount: 56.00, totalAmount: 2856.00 },
      { component: ContributionComponent.LVF, principalAmount: 0, penaltyAmount: 700.00, interestAmount: 0, totalAmount: 700.00 },
    ],
    totalDebtAmount: 9056.00,
    downPaymentRequired: true,
    downPaymentAmount: 2000.00,
    downPaymentPaid: true,
    downPaymentDate: '2024-01-15',
    downPaymentReference: 'PMT-2024-0115',
    installmentType: 'EQUAL',
    numberOfInstallments: 6,
    frequency: 'MONTHLY',
    startDate: '2024-02-01',
    endDate: '2024-07-01',
    nextDueDate: '2024-04-01',
    installments: [],
    status: 'ACTIVE',
    installmentsPaid: 2,
    installmentsOverdue: 0,
    totalPaid: 4352.67,
    outstandingBalance: 4703.33,
    consecutiveMissedPayments: 0,
    onTimePaymentRate: 100,
    lastPaymentDate: '2024-03-01',
    terms: 'Monthly installments of EC$1,176.00 due on the 1st of each month. Employer must remain current with all new C3 submissions during the arrangement period.',
    conditions: [
      'Must submit all C3s on time during arrangement period',
      'Late payment fee of 10% applies after 5 days past due',
      'Default after 2 consecutive missed payments',
      'Upon default, full balance becomes immediately due'
    ],
    requiresCurrentPayments: true,
    defaultThreshold: 2,
    createdDate: '2024-01-10',
    createdBy: 'USER-001',
    createdByName: 'Inspector John Smith',
    approvedDate: '2024-01-12',
    approvedBy: 'USER-002',
    approvedByName: 'Supervisor Jane Doe',
    agreementSigned: true,
    signedDate: '2024-01-14',
    missedInstallmentIds: [],
    notes: 'Employer experiencing temporary cash flow issues due to seasonal downturn.',
  }
];

// Generate installments based on arrangement configuration
function generateInstallments(arrangement: CreateArrangementRequest, arrangementId: string): ComponentInstallmentRecord[] {
  const installments: ComponentInstallmentRecord[] = [];
  
  if (arrangement.installmentType === 'EQUAL') {
    // Calculate remaining balance after down payment
    const totalDebt = arrangement.componentBreakdown.reduce((sum, comp) => sum + comp.totalAmount, 0);
    const remainingBalance = totalDebt - (arrangement.downPaymentAmount || 0);
    const installmentAmount = remainingBalance / (arrangement.numberOfInstallments || 1);
    
    // Distribute component amounts proportionally
    const installmentBreakdown: ComponentInstallmentBreakdown[] = arrangement.componentBreakdown.map(comp => {
      const proportion = comp.totalAmount / totalDebt;
      return {
        component: comp.component,
        principalAmount: comp.principalAmount * proportion * (arrangement.numberOfInstallments || 1) / (arrangement.numberOfInstallments || 1),
        penaltyAmount: comp.penaltyAmount * proportion * (arrangement.numberOfInstallments || 1) / (arrangement.numberOfInstallments || 1),
        interestAmount: comp.interestAmount * proportion * (arrangement.numberOfInstallments || 1) / (arrangement.numberOfInstallments || 1),
        totalAmount: installmentAmount * (comp.totalAmount / totalDebt),
      };
    });
    
    // Generate equal installments
    for (let i = 1; i <= (arrangement.numberOfInstallments || 1); i++) {
      const dueDate = calculateDueDate(arrangement.startDate, i - 1, arrangement.frequency);
      installments.push({
        id: `INST-${arrangementId}-${String(i).padStart(3, '0')}`,
        arrangementId,
        installmentNumber: i,
        dueDate,
        totalAmount: installmentAmount,
        componentBreakdown: installmentBreakdown,
        paid: false,
        overdue: false,
        partialPaymentAllowed: true,
      });
    }
  } else if (arrangement.installmentType === 'CUSTOM' && arrangement.customInstallments) {
    // Use custom installments
    arrangement.customInstallments.forEach((custom, index) => {
      installments.push({
        id: `INST-${arrangementId}-${String(custom.installmentNumber).padStart(3, '0')}`,
        arrangementId,
        installmentNumber: custom.installmentNumber,
        dueDate: custom.dueDate,
        totalAmount: custom.amount,
        componentBreakdown: custom.componentBreakdown,
        paid: false,
        overdue: false,
        partialPaymentAllowed: true,
      });
    });
  }
  
  return installments;
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

// Create new payment arrangement
export async function createPaymentArrangement(request: CreateArrangementRequest): Promise<ComponentPaymentArrangement> {
  const arrangementId = `ARR-${String(mockArrangements.length + 1).padStart(3, '0')}`;
  const arrangementNumber = `PA-2024-${String(mockArrangements.length + 1).padStart(3, '0')}`;
  
  const totalDebt = request.componentBreakdown.reduce((sum, comp) => sum + comp.totalAmount, 0);
  const remainingAfterDown = totalDebt - (request.downPaymentAmount || 0);
  
  // Calculate end date
  const numberOfPeriods = request.installmentType === 'EQUAL' 
    ? (request.numberOfInstallments || 1) - 1
    : (request.customInstallments?.length || 1) - 1;
  const endDate = calculateDueDate(request.startDate, numberOfPeriods, request.frequency);
  
  const newArrangement: ComponentPaymentArrangement = {
    id: arrangementId,
    arrangementNumber,
    caseId: request.caseId,
    employerId: request.employerId,
    employerName: 'Mock Employer', // In real system, fetch from employer service
    componentBreakdown: request.componentBreakdown,
    totalDebtAmount: totalDebt,
    downPaymentRequired: request.downPaymentRequired,
    downPaymentAmount: request.downPaymentAmount || 0,
    downPaymentPaid: false,
    installmentType: request.installmentType,
    numberOfInstallments: request.numberOfInstallments || request.customInstallments?.length || 0,
    frequency: request.frequency,
    startDate: request.startDate,
    endDate,
    nextDueDate: request.startDate,
    installments: [],
    status: 'PENDING_APPROVAL',
    installmentsPaid: 0,
    installmentsOverdue: 0,
    totalPaid: 0,
    outstandingBalance: remainingAfterDown,
    consecutiveMissedPayments: 0,
    onTimePaymentRate: 100,
    terms: request.terms,
    conditions: request.conditions,
    requiresCurrentPayments: request.requiresCurrentPayments,
    defaultThreshold: request.defaultThreshold,
    createdDate: new Date().toISOString(),
    createdBy: 'USER-CURRENT', // In real system, get from auth context
    createdByName: 'Current User',
    agreementSigned: false,
    missedInstallmentIds: [],
    notes: request.notes,
  };
  
  // Generate installments
  newArrangement.installments = generateInstallments(request, arrangementId);
  
  mockArrangements.push(newArrangement);
  return newArrangement;
}

// Get arrangements for a case
export async function getArrangementsForCase(caseId: string): Promise<ComponentPaymentArrangement[]> {
  return mockArrangements.filter(arr => arr.caseId === caseId);
}

// Get arrangement by ID
export async function getArrangementById(id: string): Promise<ComponentPaymentArrangement | undefined> {
  return mockArrangements.find(arr => arr.id === id);
}

// Record payment for installment
export async function recordInstallmentPayment(
  arrangementId: string,
  installmentId: string,
  amount: number,
  paymentDate: string,
  reference: string
): Promise<ComponentPaymentArrangement> {
  const arrangement = mockArrangements.find(arr => arr.id === arrangementId);
  if (!arrangement) throw new Error('Arrangement not found');
  
  const installment = arrangement.installments.find(inst => inst.id === installmentId);
  if (!installment) throw new Error('Installment not found');
  
  installment.paid = true;
  installment.paidAmount = amount;
  installment.paidDate = paymentDate;
  installment.paymentReference = reference;
  installment.overdue = false;
  installment.daysPastDue = 0;
  
  // Update arrangement totals
  arrangement.installmentsPaid += 1;
  arrangement.totalPaid += amount;
  arrangement.outstandingBalance -= amount;
  arrangement.lastPaymentDate = paymentDate;
  arrangement.consecutiveMissedPayments = 0;
  
  // Calculate on-time payment rate
  const totalDue = arrangement.installments.filter(inst => new Date(inst.dueDate) <= new Date()).length;
  const onTime = arrangement.installments.filter(inst => inst.paid && inst.paidDate && new Date(inst.paidDate) <= new Date(inst.dueDate)).length;
  arrangement.onTimePaymentRate = totalDue > 0 ? (onTime / totalDue) * 100 : 100;
  
  // Check if completed
  if (arrangement.installmentsPaid === arrangement.numberOfInstallments && arrangement.outstandingBalance <= 0) {
    arrangement.status = 'COMPLETED';
  }
  
  // Update next due date
  const nextUnpaid = arrangement.installments.find(inst => !inst.paid);
  arrangement.nextDueDate = nextUnpaid?.dueDate;
  
  return arrangement;
}

// Approve arrangement
export async function approveArrangement(arrangementId: string, approverUserId: string, approverName: string): Promise<ComponentPaymentArrangement> {
  const arrangement = mockArrangements.find(arr => arr.id === arrangementId);
  if (!arrangement) throw new Error('Arrangement not found');
  
  arrangement.status = 'ACTIVE';
  arrangement.approvedDate = new Date().toISOString();
  arrangement.approvedBy = approverUserId;
  arrangement.approvedByName = approverName;
  
  return arrangement;
}

// Mark arrangement as defaulted
export async function markArrangementDefaulted(arrangementId: string, reason: string): Promise<ComponentPaymentArrangement> {
  const arrangement = mockArrangements.find(arr => arr.id === arrangementId);
  if (!arrangement) throw new Error('Arrangement not found');
  
  arrangement.status = 'DEFAULTED';
  arrangement.defaultDate = new Date().toISOString();
  arrangement.defaultReason = reason;
  
  return arrangement;
}
