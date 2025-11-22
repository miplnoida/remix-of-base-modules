import { CardIssue, CardPrintLog, CardHistory, CardStatus, PrintStatus, IssueReasonCode } from '@/types/cardManagement';
import { getInsuredPersonById } from './serviceRequestService';

const STORAGE_KEY_CARD_ISSUES = 'card_issues';
const STORAGE_KEY_PRINT_LOGS = 'card_print_logs';

// Helper to generate IDs
const generateId = (prefix: string) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
};

// Card Issues Storage
const getCardIssues = (): CardIssue[] => {
  const stored = localStorage.getItem(STORAGE_KEY_CARD_ISSUES);
  return stored ? JSON.parse(stored) : [];
};

const saveCardIssues = (issues: CardIssue[]) => {
  localStorage.setItem(STORAGE_KEY_CARD_ISSUES, JSON.stringify(issues));
};

// Print Logs Storage
const getPrintLogs = (): CardPrintLog[] => {
  const stored = localStorage.getItem(STORAGE_KEY_PRINT_LOGS);
  return stored ? JSON.parse(stored) : [];
};

const savePrintLogs = (logs: CardPrintLog[]) => {
  localStorage.setItem(STORAGE_KEY_PRINT_LOGS, JSON.stringify(logs));
};

// Get next issue sequence for insured person
export const getNextIssueSequence = (insuredPersonId: string): number => {
  const issues = getCardIssues();
  const personIssues = issues.filter(i => i.insuredPersonId === insuredPersonId);
  return personIssues.length + 1;
};

// Create card issue
export const createCardIssue = (data: {
  insuredPersonId: string;
  serviceRequestId: string;
  issueReasonCode: IssueReasonCode;
  feeInstanceId?: string;
  createdBy: string;
}): CardIssue => {
  const issues = getCardIssues();
  const issueSequence = getNextIssueSequence(data.insuredPersonId);
  
  // Find previous active card to mark as replaced
  const previousCard = issues.find(
    i => i.insuredPersonId === data.insuredPersonId && i.status === 'Active'
  );
  
  const cardIssue: CardIssue = {
    cardIssueId: generateId('CARD'),
    insuredPersonId: data.insuredPersonId,
    serviceRequestId: data.serviceRequestId,
    issueSequence,
    issueReasonCode: data.issueReasonCode,
    cardNumber: `SSC-${data.insuredPersonId.slice(-4)}-${issueSequence.toString().padStart(3, '0')}`,
    status: 'Issued',
    feeInstanceId: data.feeInstanceId,
    previousCardIssueId: previousCard?.cardIssueId,
    issueDate: new Date().toISOString(),
    createdBy: data.createdBy,
    createdAt: new Date().toISOString()
  };
  
  // Update previous card status
  if (previousCard) {
    previousCard.status = 'Replaced';
    previousCard.updatedAt = new Date().toISOString();
  }
  
  issues.push(cardIssue);
  saveCardIssues(issues);
  return cardIssue;
};

// Update card status
export const updateCardStatus = (cardIssueId: string, status: CardStatus): CardIssue | undefined => {
  const issues = getCardIssues();
  const issue = issues.find(i => i.cardIssueId === cardIssueId);
  
  if (issue) {
    issue.status = status;
    issue.updatedAt = new Date().toISOString();
    saveCardIssues(issues);
  }
  
  return issue;
};

// Create print log
export const createPrintLog = (data: {
  cardIssueId: string;
  printedBy: string;
  printStatus: PrintStatus;
  notes?: string;
}): CardPrintLog => {
  const logs = getPrintLogs();
  const cardLogs = logs.filter(l => l.cardIssueId === data.cardIssueId);
  const printCopyNumber = cardLogs.length + 1;
  
  const printLog: CardPrintLog = {
    cardPrintLogId: generateId('PRINT'),
    cardIssueId: data.cardIssueId,
    printCopyNumber,
    printedAt: new Date().toISOString(),
    printedBy: data.printedBy,
    printStatus: data.printStatus,
    notes: data.notes
  };
  
  logs.push(printLog);
  savePrintLogs(logs);
  
  // Update card status to Active on first successful print
  if (printCopyNumber === 1 && data.printStatus === 'Success') {
    updateCardStatus(data.cardIssueId, 'Active');
  }
  
  return printLog;
};

// Get card history for insured person
export const getCardHistoryByPerson = (insuredPersonId: string): CardHistory[] => {
  const issues = getCardIssues().filter(i => i.insuredPersonId === insuredPersonId);
  const logs = getPrintLogs();
  
  return issues.map(issue => {
    const cardLogs = logs.filter(l => l.cardIssueId === issue.cardIssueId);
    return {
      cardIssue: issue,
      printLogs: cardLogs,
      totalPrints: cardLogs.length,
      spoiledPrints: cardLogs.filter(l => l.printStatus === 'Spoiled').length
    };
  }).sort((a, b) => b.cardIssue.issueSequence - a.cardIssue.issueSequence);
};

// Get card issue by ID
export const getCardIssueById = (cardIssueId: string): CardIssue | undefined => {
  return getCardIssues().find(i => i.cardIssueId === cardIssueId);
};

// Get print logs for card
export const getPrintLogsByCard = (cardIssueId: string): CardPrintLog[] => {
  return getPrintLogs().filter(l => l.cardIssueId === cardIssueId);
};

// Get all card issues
export const getAllCardIssues = (): CardIssue[] => {
  return getCardIssues();
};

// Get all print logs
export const getAllPrintLogs = (): CardPrintLog[] => {
  return getPrintLogs();
};

// Get printed and spoiled cards report data
export const getPrintedSpoiledCardsReport = (filters?: {
  startDate?: string;
  endDate?: string;
  printedBy?: string;
}) => {
  const issues = getCardIssues();
  const logs = getPrintLogs();
  
  let filteredIssues = issues;
  
  if (filters?.startDate) {
    filteredIssues = filteredIssues.filter(i => i.issueDate >= filters.startDate!);
  }
  
  if (filters?.endDate) {
    filteredIssues = filteredIssues.filter(i => i.issueDate <= filters.endDate!);
  }
  
  return filteredIssues.map(issue => {
    const person = getInsuredPersonById(issue.insuredPersonId);
    const cardLogs = logs.filter(l => l.cardIssueId === issue.cardIssueId);
    
    let filteredLogs = cardLogs;
    if (filters?.printedBy) {
      filteredLogs = filteredLogs.filter(l => l.printedBy === filters.printedBy);
    }
    
    return {
      insuredPersonName: person?.fullName || 'Unknown',
      ssn: person?.ssn || 'N/A',
      issueSequence: issue.issueSequence,
      issueReason: issue.issueReasonCode,
      printedCopies: filteredLogs.filter(l => l.printStatus === 'Success').length,
      spoiledCopies: filteredLogs.filter(l => l.printStatus === 'Spoiled').length,
      issueDate: issue.issueDate,
      printedBy: filteredLogs.length > 0 ? filteredLogs[0].printedBy : 'N/A',
      cardNumber: issue.cardNumber,
      status: issue.status
    };
  });
};
