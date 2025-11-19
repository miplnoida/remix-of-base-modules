// Mock data for all Insured Persons reports

export const ipEntryVerificationData = {
  summary: {
    totalEntered: 245,
    totalVerified: 198,
    pendingVerification: 47,
    averageVerificationTime: 2.3
  },
  byOfficer: [
    { officer: "Sarah Johnson", entered: 65, verified: 58 },
    { officer: "Michael Chen", entered: 52, verified: 49 },
    { officer: "Anish Kumar", entered: 48, verified: 42 },
    { officer: "Maria Rodriguez", entered: 45, verified: 30 },
    { officer: "David Williams", entered: 35, verified: 19 }
  ],
  timeline: [
    { date: "2025-11-01", entered: 12, verified: 10 },
    { date: "2025-11-05", entered: 15, verified: 14 },
    { date: "2025-11-08", entered: 18, verified: 15 },
    { date: "2025-11-12", entered: 22, verified: 19 },
    { date: "2025-11-15", entered: 20, verified: 18 },
    { date: "2025-11-19", entered: 16, verified: 12 }
  ],
  details: [
    { ipId: "IP10001", name: "John Doe", dateEntered: "2025-11-15", enteredBy: "Sarah Johnson", dateVerified: "2025-11-16", verifiedBy: "Michael Chen", status: "Verified" },
    { ipId: "IP10002", name: "Jane Smith", dateEntered: "2025-11-16", enteredBy: "Anish Kumar", dateVerified: "2025-11-17", verifiedBy: "Sarah Johnson", status: "Verified" },
    { ipId: "IP10003", name: "Robert Brown", dateEntered: "2025-11-17", enteredBy: "Maria Rodriguez", dateVerified: null, verifiedBy: null, status: "Pending" },
    { ipId: "IP10004", name: "Emily Davis", dateEntered: "2025-11-18", enteredBy: "David Williams", dateVerified: "2025-11-19", verifiedBy: "Anish Kumar", status: "Verified" },
    { ipId: "IP10005", name: "James Wilson", dateEntered: "2025-11-19", enteredBy: "Sarah Johnson", dateVerified: null, verifiedBy: null, status: "Pending" }
  ]
};

export const c3EntryVerificationData = {
  summary: {
    totalC3Entered: 189,
    totalC3Verified: 142,
    pendingC3: 47,
    averageVerificationTime: 3.1
  },
  byOfficer: [
    { officer: "Sarah Johnson", entered: 52, verified: 45 },
    { officer: "Michael Chen", entered: 48, verified: 38 },
    { officer: "Anish Kumar", entered: 42, verified: 35 },
    { officer: "Maria Rodriguez", entered: 30, verified: 18 },
    { officer: "David Williams", entered: 17, verified: 6 }
  ],
  timeline: [
    { date: "2025-11-01", entered: 10, verified: 8 },
    { date: "2025-11-05", entered: 12, verified: 11 },
    { date: "2025-11-08", entered: 15, verified: 12 },
    { date: "2025-11-12", entered: 18, verified: 16 },
    { date: "2025-11-15", entered: 16, verified: 14 },
    { date: "2025-11-19", entered: 13, verified: 9 }
  ],
  details: [
    { employerId: "EMP001", employerName: "ABC Construction Ltd", c3Period: "2025-10", enteredDate: "2025-11-15", enteredBy: "Sarah Johnson", verifiedDate: "2025-11-16", verifiedBy: "Michael Chen", status: "Verified" },
    { employerId: "EMP002", employerName: "XYZ Retail Inc", c3Period: "2025-10", enteredDate: "2025-11-16", enteredBy: "Anish Kumar", verifiedDate: "2025-11-17", verifiedBy: "Sarah Johnson", status: "Verified" },
    { employerId: "EMP003", employerName: "Global Services Ltd", c3Period: "2025-10", enteredDate: "2025-11-17", enteredBy: "Maria Rodriguez", verifiedDate: null, verifiedBy: null, status: "Pending" },
    { employerId: "EMP004", employerName: "Tech Solutions Inc", c3Period: "2025-10", enteredDate: "2025-11-18", enteredBy: "David Williams", verifiedDate: "2025-11-19", verifiedBy: "Anish Kumar", status: "Verified" },
    { employerId: "EMP005", employerName: "Island Hotels Group", c3Period: "2025-10", enteredDate: "2025-11-19", enteredBy: "Sarah Johnson", verifiedDate: null, verifiedBy: null, status: "Pending" }
  ]
};

export const pendingC3Data = {
  summary: {
    totalPending: 47,
    over7Days: 22,
    over30Days: 8,
    averagePendingDays: 12.5
  },
  byEmployer: [
    { employer: "Global Services Ltd", count: 8 },
    { employer: "Island Hotels Group", count: 7 },
    { employer: "Tech Solutions Inc", count: 6 },
    { employer: "ABC Construction Ltd", count: 5 },
    { employer: "Others", count: 21 }
  ],
  byAging: [
    { bucket: "0-7 days", count: 17 },
    { bucket: "8-14 days", count: 15 },
    { bucket: "15-30 days", count: 7 },
    { bucket: "Over 30 days", count: 8 }
  ],
  details: [
    { employerId: "EMP003", employerName: "Global Services Ltd", c3Period: "2025-09", enteredDate: "2025-10-15", enteredBy: "Maria Rodriguez", daysPending: 35, status: "Pending" },
    { employerId: "EMP005", employerName: "Island Hotels Group", c3Period: "2025-10", enteredDate: "2025-11-05", enteredBy: "Sarah Johnson", daysPending: 14, status: "Pending" },
    { employerId: "EMP006", employerName: "Tech Solutions Inc", c3Period: "2025-10", enteredDate: "2025-11-10", enteredBy: "David Williams", daysPending: 9, status: "Pending" },
    { employerId: "EMP007", employerName: "ABC Construction Ltd", c3Period: "2025-10", enteredDate: "2025-11-12", enteredBy: "Anish Kumar", daysPending: 7, status: "Pending" },
    { employerId: "EMP008", employerName: "Coastal Restaurant Co", c3Period: "2025-10", enteredDate: "2025-11-16", enteredBy: "Michael Chen", daysPending: 3, status: "Pending" }
  ]
};

export const age62WithoutClaimData = {
  summary: {
    totalEligible: 342,
    age6264: 156,
    age6567: 98,
    over68: 88
  },
  byAge: [
    { age: "62", count: 48 },
    { age: "63", count: 52 },
    { age: "64", count: 56 },
    { age: "65", count: 45 },
    { age: "66", count: 32 },
    { age: "67", count: 21 },
    { age: "68+", count: 88 }
  ],
  byGender: [
    { gender: "Male", count: 168 },
    { gender: "Female", count: 174 }
  ],
  details: [
    { ipId: "IP20001", name: "Margaret Thompson", dob: "1961-03-15", age: 63, contributionYears: 28, lastContribution: "2024-09-30", branch: "Basseterre", contact: "+1-869-555-0201", claimFiled: "No" },
    { ipId: "IP20002", name: "Winston Charles", dob: "1960-07-22", age: 65, contributionYears: 32, lastContribution: "2024-12-31", branch: "Charlestown", contact: "+1-869-555-0202", claimFiled: "No" },
    { ipId: "IP20003", name: "Patricia Lewis", dob: "1962-11-08", age: 62, contributionYears: 25, lastContribution: "2025-03-31", branch: "Basseterre", contact: "+1-869-555-0203", claimFiled: "No" },
    { ipId: "IP20004", name: "George Williams", dob: "1959-05-30", age: 66, contributionYears: 35, lastContribution: "2023-12-31", branch: "Basseterre", contact: "+1-869-555-0204", claimFiled: "No" },
    { ipId: "IP20005", name: "Dorothy Anderson", dob: "1963-09-12", age: 62, contributionYears: 22, lastContribution: "2025-06-30", branch: "Charlestown", contact: "+1-869-555-0205", claimFiled: "No" }
  ]
};

export const employerNotificationsData = {
  summary: {
    totalLetters: 156,
    overpayment: 72,
    underpayment: 84,
    acknowledged: 98
  },
  byType: [
    { type: "Overpayment", count: 72 },
    { type: "Underpayment", count: 84 }
  ],
  byMonth: [
    { month: "Jul 2025", overpayment: 8, underpayment: 12 },
    { month: "Aug 2025", overpayment: 12, underpayment: 15 },
    { month: "Sep 2025", overpayment: 14, underpayment: 18 },
    { month: "Oct 2025", overpayment: 16, underpayment: 19 },
    { month: "Nov 2025", overpayment: 22, underpayment: 20 }
  ],
  details: [
    { employerId: "EMP101", employerName: "ABC Construction Ltd", letterId: "LTR-2025-1001", letterType: "Underpayment", dateSent: "2025-11-15", method: "Email", status: "Acknowledged" },
    { employerId: "EMP102", employerName: "XYZ Retail Inc", letterId: "LTR-2025-1002", letterType: "Overpayment", dateSent: "2025-11-16", method: "Print", status: "Sent" },
    { employerId: "EMP103", employerName: "Global Services Ltd", letterId: "LTR-2025-1003", letterType: "Underpayment", dateSent: "2025-11-17", method: "Email", status: "Acknowledged" },
    { employerId: "EMP104", employerName: "Tech Solutions Inc", letterId: "LTR-2025-1004", letterType: "Overpayment", dateSent: "2025-11-18", method: "Email", status: "Sent" },
    { employerId: "EMP105", employerName: "Island Hotels Group", letterId: "LTR-2025-1005", letterType: "Underpayment", dateSent: "2025-11-19", method: "Print", status: "Acknowledged" }
  ]
};

export const outstandingDiscrepanciesData = {
  summary: {
    totalDiscrepancies: 89,
    critical: 23,
    high: 34,
    medium: 32
  },
  byType: [
    { type: "SSN Mismatch", count: 28 },
    { type: "Wage Discrepancy", count: 22 },
    { type: "Missing Documentation", count: 18 },
    { type: "Contribution Gap", count: 12 },
    { type: "Other", count: 9 }
  ],
  byAging: [
    { bucket: "0-7 days", count: 25 },
    { bucket: "8-14 days", count: 22 },
    { bucket: "15-30 days", count: 18 },
    { bucket: "Over 30 days", count: 24 }
  ],
  details: [
    { discrepancyId: "DISC-2025-001", ipId: "IP10012", employerId: "EMP201", type: "SSN Mismatch", openedDate: "2025-10-10", assignedOfficer: "Sarah Johnson", priority: "Critical", status: "Open", daysOutstanding: 40 },
    { discrepancyId: "DISC-2025-002", ipId: "IP10023", employerId: "EMP202", type: "Wage Discrepancy", openedDate: "2025-11-01", assignedOfficer: "Michael Chen", priority: "High", status: "In Progress", daysOutstanding: 18 },
    { discrepancyId: "DISC-2025-003", ipId: "IP10034", employerId: null, type: "Missing Documentation", openedDate: "2025-11-10", assignedOfficer: "Anish Kumar", priority: "Medium", status: "Open", daysOutstanding: 9 },
    { discrepancyId: "DISC-2025-004", ipId: "IP10045", employerId: "EMP203", type: "Contribution Gap", openedDate: "2025-11-12", assignedOfficer: "Maria Rodriguez", priority: "High", status: "Open", daysOutstanding: 7 },
    { discrepancyId: "DISC-2025-005", ipId: "IP10056", employerId: "EMP204", type: "SSN Mismatch", openedDate: "2025-11-15", assignedOfficer: "David Williams", priority: "Critical", status: "In Progress", daysOutstanding: 4 }
  ]
};

export const missingSsnData = {
  summary: {
    totalMissing: 67,
    employersAffected: 28,
    totalWages: 245680,
    averagePerEntry: 3667
  },
  byEmployer: [
    { employer: "Global Services Ltd", count: 12 },
    { employer: "ABC Construction Ltd", count: 10 },
    { employer: "Island Hotels Group", count: 8 },
    { employer: "Tech Solutions Inc", count: 7 },
    { employer: "Others", count: 30 }
  ],
  timeline: [
    { month: "Jul 2025", count: 8 },
    { month: "Aug 2025", count: 10 },
    { month: "Sep 2025", count: 12 },
    { month: "Oct 2025", count: 15 },
    { month: "Nov 2025", count: 22 }
  ],
  details: [
    { employerId: "EMP301", employerName: "Global Services Ltd", c3Period: "2025-10", employeeName: "John Unknown", wages: 4500, enteredDate: "2025-11-15", enteredBy: "Sarah Johnson", ssnMissing: "Yes" },
    { employerId: "EMP302", employerName: "ABC Construction Ltd", c3Period: "2025-10", employeeName: "Maria Pending", wages: 3800, enteredDate: "2025-11-16", enteredBy: "Anish Kumar", ssnMissing: "Yes" },
    { employerId: "EMP303", employerName: "Island Hotels Group", c3Period: "2025-10", employeeName: "Robert NoSSN", wages: 5200, enteredDate: "2025-11-17", enteredBy: "Maria Rodriguez", ssnMissing: "Yes" },
    { employerId: "EMP304", employerName: "Tech Solutions Inc", c3Period: "2025-10", employeeName: "Emily Missing", wages: 4100, enteredDate: "2025-11-18", enteredBy: "David Williams", ssnMissing: "Yes" },
    { employerId: "EMP305", employerName: "Coastal Restaurant Co", c3Period: "2025-10", employeeName: "James TBD", wages: 2900, enteredDate: "2025-11-19", enteredBy: "Michael Chen", ssnMissing: "Yes" }
  ]
};

export const scanningActivityData = {
  summary: {
    totalScanned: 1247,
    c3Documents: 589,
    claimForms: 342,
    registrationForms: 316
  },
  byType: [
    { type: "C3 Forms", count: 589 },
    { type: "Claim Forms", count: 342 },
    { type: "Registration", count: 246 },
    { type: "Replacement", count: 70 }
  ],
  timeline: [
    { date: "2025-11-15", c3: 45, claims: 28, registration: 22 },
    { date: "2025-11-16", c3: 52, claims: 32, registration: 18 },
    { date: "2025-11-17", c3: 48, claims: 30, registration: 25 },
    { date: "2025-11-18", c3: 55, claims: 35, registration: 20 },
    { date: "2025-11-19", c3: 50, claims: 29, registration: 23 }
  ],
  details: [
    { documentId: "DOC-2025-5001", documentType: "C3 Form", relatedEntity: "EMP401", scanDate: "2025-11-19 09:15", scannedBy: "Sarah Johnson", station: "Station A" },
    { documentId: "DOC-2025-5002", documentType: "Claim Form", relatedEntity: "IP30001", scanDate: "2025-11-19 09:32", scannedBy: "Michael Chen", station: "Station B" },
    { documentId: "DOC-2025-5003", documentType: "Registration", relatedEntity: "IP30002", scanDate: "2025-11-19 10:05", scannedBy: "Anish Kumar", station: "Station A" },
    { documentId: "DOC-2025-5004", documentType: "C3 Form", relatedEntity: "EMP402", scanDate: "2025-11-19 10:28", scannedBy: "Maria Rodriguez", station: "Station C" },
    { documentId: "DOC-2025-5005", documentType: "Replacement", relatedEntity: "IP30003", scanDate: "2025-11-19 11:15", scannedBy: "David Williams", station: "Station B" }
  ]
};

export const electronicC3Data = {
  summary: {
    totalElectronic: 289,
    employersUsingPortal: 78,
    portalUploads: 245,
    apiUploads: 44
  },
  byEmployer: [
    { employer: "Tech Solutions Inc", count: 42 },
    { employer: "Global Services Ltd", count: 38 },
    { employer: "Island Hotels Group", count: 35 },
    { employer: "ABC Construction Ltd", count: 28 },
    { employer: "Others", count: 146 }
  ],
  electronicVsManual: [
    { month: "Jul 2025", electronic: 42, manual: 68 },
    { month: "Aug 2025", electronic: 48, manual: 62 },
    { month: "Sep 2025", electronic: 52, manual: 58 },
    { month: "Oct 2025", electronic: 58, manual: 52 },
    { month: "Nov 2025", electronic: 65, manual: 45 }
  ],
  details: [
    { employerId: "EMP501", employerName: "Tech Solutions Inc", c3Period: "2025-10", uploadDate: "2025-11-15", uploadMethod: "Portal", status: "Processed" },
    { employerId: "EMP502", employerName: "Global Services Ltd", c3Period: "2025-10", uploadDate: "2025-11-16", uploadMethod: "API", status: "Processed" },
    { employerId: "EMP503", employerName: "Island Hotels Group", c3Period: "2025-10", uploadDate: "2025-11-17", uploadMethod: "Portal", status: "Processing" },
    { employerId: "EMP504", employerName: "ABC Construction Ltd", c3Period: "2025-10", uploadDate: "2025-11-18", uploadMethod: "Portal", status: "Processed" },
    { employerId: "EMP505", employerName: "Coastal Restaurant Co", c3Period: "2025-10", uploadDate: "2025-11-19", uploadMethod: "Portal", status: "Processing" }
  ]
};

export const longTermClaimsData = {
  summary: {
    totalClaims: 456,
    processed: 342,
    outstanding: 114,
    averageProcessingDays: 18.5
  },
  byType: [
    { type: "Age Benefit", processed: 156, outstanding: 28 },
    { type: "Invalidity", processed: 98, outstanding: 42 },
    { type: "Survivors", processed: 88, outstanding: 44 }
  ],
  timeline: [
    { month: "Jul 2025", processed: 52, outstanding: 18 },
    { month: "Aug 2025", processed: 58, outstanding: 22 },
    { month: "Sep 2025", processed: 62, outstanding: 20 },
    { month: "Oct 2025", processed: 68, outstanding: 24 },
    { month: "Nov 2025", processed: 72, outstanding: 30 }
  ],
  details: [
    { claimId: "CLM-2025-3001", ipId: "IP40001", claimType: "Age Benefit", dateReceived: "2025-10-15", dateProcessed: "2025-11-05", status: "Processed", daysOutstanding: 0 },
    { claimId: "CLM-2025-3002", ipId: "IP40002", claimType: "Invalidity", dateReceived: "2025-11-01", dateProcessed: null, status: "Outstanding", daysOutstanding: 18 },
    { claimId: "CLM-2025-3003", ipId: "IP40003", claimType: "Survivors", dateReceived: "2025-11-05", dateProcessed: null, status: "Outstanding", daysOutstanding: 14 },
    { claimId: "CLM-2025-3004", ipId: "IP40004", claimType: "Age Benefit", dateReceived: "2025-11-10", dateProcessed: "2025-11-18", status: "Processed", daysOutstanding: 0 },
    { claimId: "CLM-2025-3005", ipId: "IP40005", claimType: "Invalidity", dateReceived: "2025-11-12", dateProcessed: null, status: "Outstanding", daysOutstanding: 7 }
  ]
};

export const c3WithoutPaymentData = {
  summary: {
    totalWithoutPayment: 45,
    employersAffected: 23,
    totalAmountDue: 345670,
    averageDaysUnpaid: 28
  },
  byEmployer: [
    { employer: "Coastal Restaurant Co", count: 8 },
    { employer: "Small Retail Shop", count: 6 },
    { employer: "Local Construction", count: 5 },
    { employer: "Service Provider Ltd", count: 4 },
    { employer: "Others", count: 22 }
  ],
  timeline: [
    { month: "Jul 2025", count: 6 },
    { month: "Aug 2025", count: 7 },
    { month: "Sep 2025", count: 8 },
    { month: "Oct 2025", count: 10 },
    { month: "Nov 2025", count: 14 }
  ],
  details: [
    { employerId: "EMP601", employerName: "Coastal Restaurant Co", c3Period: "2025-09", receivedDate: "2025-10-15", paymentStatus: "Unpaid", amountDue: 8500, daysSince: 35 },
    { employerId: "EMP602", employerName: "Small Retail Shop", c3Period: "2025-10", receivedDate: "2025-11-05", paymentStatus: "Unpaid", amountDue: 6200, daysSince: 14 },
    { employerId: "EMP603", employerName: "Local Construction", c3Period: "2025-10", receivedDate: "2025-11-10", paymentStatus: "Unpaid", amountDue: 9800, daysSince: 9 },
    { employerId: "EMP604", employerName: "Service Provider Ltd", c3Period: "2025-10", receivedDate: "2025-11-12", paymentStatus: "Unpaid", amountDue: 5400, daysSince: 7 },
    { employerId: "EMP605", employerName: "Island Bakery", c3Period: "2025-10", receivedDate: "2025-11-15", paymentStatus: "Unpaid", amountDue: 4100, daysSince: 4 }
  ]
};

export const highWageMultiEmployerData = {
  summary: {
    totalPersons: 87,
    averageWages: 7850,
    maxWages: 12400,
    averageEmployers: 2.4
  },
  wageDistribution: [
    { range: "6500-7000", count: 22 },
    { range: "7001-8000", count: 28 },
    { range: "8001-9000", count: 18 },
    { range: "9001-10000", count: 12 },
    { range: "10000+", count: 7 }
  ],
  byBranch: [
    { branch: "Basseterre", count: 52 },
    { branch: "Charlestown", count: 35 }
  ],
  details: [
    { ipId: "IP50001", name: "James Anderson", numEmployers: 3, totalWages: 8450, employers: "Tech Solutions, Global Services, ABC Construction", branch: "Basseterre" },
    { ipId: "IP50002", name: "Patricia Martinez", numEmployers: 2, totalWages: 7850, employers: "Island Hotels, XYZ Retail", branch: "Charlestown" },
    { ipId: "IP50003", name: "Robert Johnson", numEmployers: 3, totalWages: 9200, employers: "Tech Solutions, Service Provider, Local Construction", branch: "Basseterre" },
    { ipId: "IP50004", name: "Maria Williams", numEmployers: 2, totalWages: 7100, employers: "Global Services, ABC Construction", branch: "Basseterre" },
    { ipId: "IP50005", name: "David Thompson", numEmployers: 4, totalWages: 12400, employers: "Tech Solutions, Global Services, Island Hotels, XYZ Retail", branch: "Charlestown" }
  ]
};

export const auditSampleData = {
  summary: {
    totalPopulation: 5678,
    sampleSize: 284,
    samplePercentage: 5,
    generatedDate: "2025-11-19"
  },
  dataSetOptions: [
    { value: "c3", label: "C3 Submissions" },
    { value: "claims", label: "Claims" },
    { value: "registrations", label: "Registrations" },
    { value: "replacements", label: "Replacement Cards" }
  ],
  sampleRecords: [
    { recordId: "C3-2025-4501", type: "C3", employer: "Tech Solutions Inc", period: "2025-10", submittedDate: "2025-11-15", status: "Verified" },
    { recordId: "CLM-2025-6789", type: "Claim", ipId: "IP60001", claimType: "Age Benefit", receivedDate: "2025-11-10", status: "Processed" },
    { recordId: "REG-2025-8912", type: "Registration", ipId: "IP60002", registrationType: "New", registeredDate: "2025-11-12", status: "Approved" },
    { recordId: "C3-2025-4502", type: "C3", employer: "Global Services Ltd", period: "2025-10", submittedDate: "2025-11-16", status: "Verified" },
    { recordId: "REPL-2025-3345", type: "Replacement", ipId: "IP60003", reason: "Lost Card", requestDate: "2025-11-14", status: "Completed" }
  ]
};

export const c3LineItemChangesData = {
  summary: {
    totalChanges: 234,
    wageAdjustments: 98,
    ssnCorrections: 76,
    otherChanges: 60
  },
  byOfficer: [
    { officer: "Sarah Johnson", changes: 52 },
    { officer: "Michael Chen", changes: 48 },
    { officer: "Anish Kumar", changes: 45 },
    { officer: "Maria Rodriguez", changes: 42 },
    { officer: "David Williams", changes: 47 }
  ],
  byChangeType: [
    { type: "Wage Adjusted", count: 98 },
    { type: "SSN Corrected", count: 76 },
    { type: "Name Corrected", count: 32 },
    { type: "Weeks Adjusted", count: 28 }
  ],
  details: [
    { changeId: "CHG-2025-0001", c3Id: "C3-2025-5601", employer: "Tech Solutions Inc", ipId: "IP70001", fieldChanged: "Wage", oldValue: "4500", newValue: "4800", changedBy: "Sarah Johnson", changeDate: "2025-11-15" },
    { changeId: "CHG-2025-0002", c3Id: "C3-2025-5602", employer: "Global Services Ltd", ipId: "IP70002", fieldChanged: "SSN", oldValue: "123-45-6789", newValue: "123-45-6790", changedBy: "Michael Chen", changeDate: "2025-11-16" },
    { changeId: "CHG-2025-0003", c3Id: "C3-2025-5603", employer: "Island Hotels Group", ipId: "IP70003", fieldChanged: "Name", oldValue: "John Doe", newValue: "Jon Doe", changedBy: "Anish Kumar", changeDate: "2025-11-17" },
    { changeId: "CHG-2025-0004", c3Id: "C3-2025-5604", employer: "ABC Construction Ltd", ipId: "IP70004", fieldChanged: "Weeks Worked", oldValue: "4", newValue: "4.5", changedBy: "Maria Rodriguez", changeDate: "2025-11-18" },
    { changeId: "CHG-2025-0005", c3Id: "C3-2025-5605", employer: "XYZ Retail Inc", ipId: "IP70005", fieldChanged: "Wage", oldValue: "3200", newValue: "3500", changedBy: "David Williams", changeDate: "2025-11-19" }
  ]
};
