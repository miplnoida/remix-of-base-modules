// Card Management Types for Card Printing & Replacements

export type CardStatus = 
  | 'Issued' 
  | 'Active' 
  | 'Spoiled' 
  | 'Cancelled' 
  | 'Replaced';

export type PrintStatus = 
  | 'Success' 
  | 'Error' 
  | 'Spoiled';

export type IssueReasonCode =
  | 'FIRST_ISSUE'
  | 'LOST'
  | 'STOLEN'
  | 'DAMAGED'
  | 'NAME_CHANGE'
  | 'NON_CITIZEN_RENEWAL';

export interface CardIssue {
  cardIssueId: string;
  insuredPersonId: string;
  serviceRequestId: string;
  issueSequence: number; // 1, 2, 3...
  issueReasonCode: IssueReasonCode;
  cardNumber: string;
  status: CardStatus;
  feeInstanceId?: string; // From existing fee module
  previousCardIssueId?: string;
  issueDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CardPrintLog {
  cardPrintLogId: string;
  cardIssueId: string;
  printCopyNumber: number; // 1st print, 2nd print (reprint), etc.
  printedAt: string;
  printedBy: string;
  printStatus: PrintStatus;
  notes?: string;
}

export interface CardHistory {
  cardIssue: CardIssue;
  printLogs: CardPrintLog[];
  totalPrints: number;
  spoiledPrints: number;
}
