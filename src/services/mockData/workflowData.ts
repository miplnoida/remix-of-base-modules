import { WorkflowDefinition, WorkflowRun, WorkflowFormSubmission } from "@/types/workflow";

export const mockWorkflows: WorkflowDefinition[] = [
  {
    id: "wf-001",
    name: "Retirement Benefit Application",
    description: "Process retirement benefit applications with eligibility checks and supervisor approval",
    status: "Active",
    createdBy: "admin",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
    activeVersionNumber: 3,
    tags: ["Benefits", "Retirement"]
  },
  {
    id: "wf-002",
    name: "Sickness Benefit Claim",
    description: "Validate and process sickness benefit claims with medical certificate verification",
    status: "Active",
    createdBy: "admin",
    createdAt: "2024-01-10T09:00:00Z",
    updatedAt: "2024-01-25T16:45:00Z",
    activeVersionNumber: 2,
    tags: ["Benefits", "Sickness"]
  },
  {
    id: "wf-003",
    name: "Employer Contribution Registration",
    description: "Onboard new employers with TIN verification and account setup",
    status: "Active",
    createdBy: "admin",
    createdAt: "2024-02-01T11:00:00Z",
    updatedAt: "2024-02-05T10:15:00Z",
    activeVersionNumber: 1,
    tags: ["Employers", "Registration"]
  },
  {
    id: "wf-004",
    name: "Compliance Audit Case",
    description: "Manage compliance audit workflow with document requests and escalation",
    status: "Active",
    createdBy: "admin",
    createdAt: "2024-01-20T13:00:00Z",
    updatedAt: "2024-02-10T11:30:00Z",
    activeVersionNumber: 4,
    tags: ["Compliance", "Audit"]
  },
  {
    id: "wf-005",
    name: "Customer Service Ticket",
    description: "Route and resolve customer service inquiries",
    status: "Active",
    createdBy: "admin",
    createdAt: "2024-02-15T08:00:00Z",
    updatedAt: "2024-02-15T08:00:00Z",
    activeVersionNumber: 1,
    tags: ["Support", "Customer Service"]
  },
  {
    id: "wf-006",
    name: "Maternity Benefit Application",
    description: "Process maternity benefit claims",
    status: "Draft",
    createdBy: "process_owner",
    createdAt: "2024-02-20T10:00:00Z",
    updatedAt: "2024-02-20T10:00:00Z",
    tags: ["Benefits", "Maternity"]
  }
];

export const mockWorkflowRuns: WorkflowRun[] = [
  {
    id: "run-001",
    workflowVersionId: "ver-001",
    workflowName: "Retirement Benefit Application",
    startedBy: "user-001",
    startedByName: "John Doe",
    status: "InProgress",
    startedAt: "2024-11-22T08:30:00Z",
    currentStep: "Supervisor Review",
    metadata: { ssn: "SKN-123-456", channel: "Portal" }
  },
  {
    id: "run-002",
    workflowVersionId: "ver-002",
    workflowName: "Sickness Benefit Claim",
    startedBy: "user-002",
    startedByName: "Jane Smith",
    status: "Completed",
    startedAt: "2024-11-21T14:00:00Z",
    completedAt: "2024-11-21T16:45:00Z",
    metadata: { claimNumber: "CLM-2024-567" }
  },
  {
    id: "run-003",
    workflowVersionId: "ver-003",
    workflowName: "Employer Contribution Registration",
    startedBy: "user-003",
    startedByName: "Mike Johnson",
    status: "InProgress",
    startedAt: "2024-11-22T09:15:00Z",
    currentStep: "Verify TIN",
    metadata: { employerName: "ABC Construction Ltd." }
  },
  {
    id: "run-004",
    workflowVersionId: "ver-004",
    workflowName: "Compliance Audit Case",
    startedBy: "user-001",
    startedByName: "John Doe",
    status: "Pending",
    startedAt: "2024-11-22T10:00:00Z",
    currentStep: "Document Request",
    metadata: { caseNumber: "CASE-2024-001" }
  },
  {
    id: "run-005",
    workflowVersionId: "ver-005",
    workflowName: "Customer Service Ticket",
    startedBy: "user-004",
    startedByName: "Sarah Williams",
    status: "Failed",
    startedAt: "2024-11-21T11:30:00Z",
    completedAt: "2024-11-21T11:35:00Z",
    metadata: { ticketId: "TKT-001" }
  }
];

export const mockFormSubmissions: WorkflowFormSubmission[] = [
  {
    id: "sub-001",
    runId: "run-001",
    stepId: "step-intake",
    stepName: "Application Intake",
    formData: {
      ssn: "SKN-123-456",
      fullName: "John Michael Smith",
      monthlyEarnings: 3500,
      contributionYears: 25,
      retirementDate: "2025-01-01"
    },
    submittedBy: "user-001",
    submittedByName: "John Doe",
    createdAt: "2024-11-22T08:35:00Z"
  },
  {
    id: "sub-002",
    runId: "run-002",
    stepId: "step-medical",
    stepName: "Medical Certificate Upload",
    formData: {
      claimNumber: "CLM-2024-567",
      hasMedicalCertificate: true,
      diagnosisCode: "J06.9",
      sickLeaveDays: 14
    },
    submittedBy: "user-002",
    submittedByName: "Jane Smith",
    createdAt: "2024-11-21T14:10:00Z"
  }
];
