import {
  Employee,
  UserAccount,
  OrgUnit,
  Position,
  PositionAssignment,
  Role,
  Permission,
  RolePermission,
  RoleAssignment,
  Delegation,
  ApprovalMatrix,
  WorkflowScheme,
  WorkflowStep,
} from "@/types/systemAdmin";

export const employees: Employee[] = [
  {
    employeeId: "EMP001",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@ssb.gov.kn",
    phone: "+1-869-555-0101",
    employmentStatus: "Active",
    hireDate: "2020-01-15",
    location: "Head Office",
  },
  {
    employeeId: "EMP002",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@ssb.gov.kn",
    phone: "+1-869-555-0102",
    employmentStatus: "Active",
    hireDate: "2019-03-20",
    location: "Head Office",
  },
  {
    employeeId: "EMP003",
    firstName: "Michael",
    lastName: "Johnson",
    email: "michael.johnson@ssb.gov.kn",
    phone: "+1-869-555-0103",
    employmentStatus: "Active",
    hireDate: "2021-06-10",
    location: "Nevis Branch",
    zone: "Zone A",
  },
];

export const userAccounts: UserAccount[] = [
  {
    userId: "USER001",
    employeeId: "EMP001",
    isActive: true,
    authenticationType: "Local",
    passwordLastChanged: "2024-01-15",
    failedLoginCount: 0,
    lastLoginDateTime: "2024-11-20T09:30:00",
  },
  {
    userId: "USER002",
    employeeId: "EMP002",
    isActive: true,
    authenticationType: "Local",
    passwordLastChanged: "2024-02-10",
    failedLoginCount: 0,
    lastLoginDateTime: "2024-11-19T14:20:00",
  },
];

export const orgUnits: OrgUnit[] = [
  {
    orgUnitId: "ORG001",
    name: "Social Security Board",
    type: "Division",
    activeFlag: true,
  },
  {
    orgUnitId: "ORG002",
    name: "Finance Division",
    type: "Division",
    parentOrgUnitId: "ORG001",
    activeFlag: true,
  },
  {
    orgUnitId: "ORG003",
    name: "Compliance Department",
    type: "Department",
    parentOrgUnitId: "ORG001",
    activeFlag: true,
  },
  {
    orgUnitId: "ORG004",
    name: "Benefits Department",
    type: "Department",
    parentOrgUnitId: "ORG001",
    activeFlag: true,
  },
  {
    orgUnitId: "ORG005",
    name: "Cashier Unit",
    type: "Unit",
    parentOrgUnitId: "ORG002",
    activeFlag: true,
  },
];

export const positions: Position[] = [
  {
    positionId: "POS001",
    positionName: "Director of Finance",
    orgUnitId: "ORG002",
    gradeLevel: "Executive",
    isManager: true,
    isApprover: true,
    defaultApprovalLimitXCD: 500000,
    activeFlag: true,
  },
  {
    positionId: "POS002",
    positionName: "Finance Manager",
    orgUnitId: "ORG002",
    gradeLevel: "Manager",
    reportsToPositionId: "POS001",
    isManager: true,
    isApprover: true,
    defaultApprovalLimitXCD: 50000,
    activeFlag: true,
  },
  {
    positionId: "POS003",
    positionName: "Finance Officer",
    orgUnitId: "ORG002",
    gradeLevel: "Officer",
    reportsToPositionId: "POS002",
    isManager: false,
    isApprover: true,
    defaultApprovalLimitXCD: 5000,
    activeFlag: true,
  },
  {
    positionId: "POS004",
    positionName: "Compliance Inspector - Zone A",
    orgUnitId: "ORG003",
    gradeLevel: "Officer",
    isManager: false,
    isApprover: false,
    activeFlag: true,
  },
];

export const positionAssignments: PositionAssignment[] = [
  {
    positionAssignmentId: "PA001",
    positionId: "POS001",
    employeeId: "EMP001",
    startDate: "2020-01-15",
    isPrimary: true,
    isActing: false,
  },
  {
    positionAssignmentId: "PA002",
    positionId: "POS002",
    employeeId: "EMP002",
    startDate: "2019-03-20",
    isPrimary: true,
    isActing: false,
  },
];

export const roles: Role[] = [
  {
    roleId: "ROLE001",
    roleName: "System Administrator",
    description: "Full system access and configuration",
    isSystemRole: true,
  },
  {
    roleId: "ROLE002",
    roleName: "Finance Officer",
    description: "Manage finance operations",
    isSystemRole: true,
  },
  {
    roleId: "ROLE003",
    roleName: "Finance Manager",
    description: "Approve financial transactions",
    isSystemRole: true,
  },
  {
    roleId: "ROLE004",
    roleName: "Director Finance",
    description: "Senior financial approvals",
    isSystemRole: true,
  },
  {
    roleId: "ROLE005",
    roleName: "Compliance Inspector",
    description: "Field inspections and audits",
    isSystemRole: true,
  },
  {
    roleId: "ROLE006",
    roleName: "Compliance Manager",
    description: "Manage compliance operations",
    isSystemRole: true,
  },
];

export const permissions: Permission[] = [
  {
    permissionId: "PERM001",
    permissionKey: "ADMIN.SYSTEM.FULL",
    description: "Full system administration",
  },
  {
    permissionId: "PERM002",
    permissionKey: "FIN.PAYMENT.CREATE",
    description: "Create payments",
  },
  {
    permissionId: "PERM003",
    permissionKey: "FIN.PAYMENT.APPROVE",
    description: "Approve payments",
  },
  {
    permissionId: "PERM004",
    permissionKey: "FIN.WAIVER.CREATE",
    description: "Create fee waivers",
  },
  {
    permissionId: "PERM005",
    permissionKey: "FIN.WAIVER.APPROVE",
    description: "Approve fee waivers",
  },
  {
    permissionId: "PERM006",
    permissionKey: "COMP.CASE.VIEW",
    description: "View compliance cases",
  },
  {
    permissionId: "PERM007",
    permissionKey: "COMP.CASE.CREATE",
    description: "Create compliance cases",
  },
  {
    permissionId: "PERM008",
    permissionKey: "COMP.PLAN.APPROVE",
    description: "Approve weekly plans",
  },
];

export const rolePermissions: RolePermission[] = [
  { roleId: "ROLE001", permissionId: "PERM001" },
  { roleId: "ROLE002", permissionId: "PERM002" },
  { roleId: "ROLE002", permissionId: "PERM004" },
  { roleId: "ROLE003", permissionId: "PERM002" },
  { roleId: "ROLE003", permissionId: "PERM003" },
  { roleId: "ROLE003", permissionId: "PERM005" },
  { roleId: "ROLE004", permissionId: "PERM003" },
  { roleId: "ROLE004", permissionId: "PERM005" },
  { roleId: "ROLE005", permissionId: "PERM006" },
  { roleId: "ROLE005", permissionId: "PERM007" },
  { roleId: "ROLE006", permissionId: "PERM006" },
  { roleId: "ROLE006", permissionId: "PERM007" },
  { roleId: "ROLE006", permissionId: "PERM008" },
];

export const roleAssignments: RoleAssignment[] = [
  {
    roleAssignmentId: "RA001",
    roleId: "ROLE004",
    positionId: "POS001",
    startDate: "2020-01-15",
  },
  {
    roleAssignmentId: "RA002",
    roleId: "ROLE003",
    positionId: "POS002",
    startDate: "2019-03-20",
  },
  {
    roleAssignmentId: "RA003",
    roleId: "ROLE002",
    positionId: "POS003",
    startDate: "2021-06-10",
  },
];

export const delegations: Delegation[] = [
  {
    delegationId: "DEL001",
    fromPositionId: "POS002",
    toPositionId: "POS003",
    startDate: "2024-11-25",
    endDate: "2024-12-10",
    scope: "All Approvals",
    maxApprovalLimitXCD: 50000,
    reason: "Annual Leave",
    createdBy: "EMP002",
    createdOn: "2024-11-15",
  },
  {
    delegationId: "DEL002",
    fromPositionId: "POS001",
    toPositionId: "POS002",
    startDate: "2024-12-01",
    endDate: "2024-12-05",
    scope: "FinancePaymentApproval",
    reason: "Conference Attendance",
    createdBy: "EMP001",
    createdOn: "2024-11-18",
  },
];

export const approvalMatrix: ApprovalMatrix[] = [
  {
    approvalMatrixId: "AM001",
    processType: "Payment",
    rangeMinXCD: 0,
    rangeMaxXCD: 5000,
    approverType: "Role",
    approverRoleId: "ROLE002",
    sequenceOrder: 1,
    activeFlag: true,
    createdBy: "Jane Smith",
    createdOn: "2024-01-10T08:00:00Z",
    lastModifiedBy: "Jane Smith",
    lastModifiedOn: "2024-01-10T08:00:00Z",
    changeHistory: [
      {
        auditId: "AUD001",
        approvalMatrixId: "AM001",
        action: "Created",
        changedBy: "Jane Smith",
        changedOn: "2024-01-10T08:00:00Z",
        fieldChanges: [],
        changeDescription: "Initial creation of payment approval rule"
      }
    ]
  },
  {
    approvalMatrixId: "AM002",
    processType: "Payment",
    rangeMinXCD: 5001,
    rangeMaxXCD: 50000,
    approverType: "Role",
    approverRoleId: "ROLE003",
    sequenceOrder: 1,
    activeFlag: true,
    createdBy: "John Doe",
    createdOn: "2024-01-10T09:00:00Z",
    lastModifiedBy: "Jane Smith",
    lastModifiedOn: "2024-03-15T10:30:00Z",
    changeHistory: [
      {
        auditId: "AUD002",
        approvalMatrixId: "AM002",
        action: "Created",
        changedBy: "John Doe",
        changedOn: "2024-01-10T09:00:00Z",
        fieldChanges: [],
        changeDescription: "Initial creation of payment approval rule"
      },
      {
        auditId: "AUD003",
        approvalMatrixId: "AM002",
        action: "Updated",
        changedBy: "Jane Smith",
        changedOn: "2024-03-15T10:30:00Z",
        fieldChanges: [
          { field: "rangeMaxXCD", oldValue: 40000, newValue: 50000 }
        ],
        changeDescription: "Increased maximum amount threshold"
      }
    ]
  },
  {
    approvalMatrixId: "AM003",
    processType: "Payment",
    rangeMinXCD: 50001,
    rangeMaxXCD: 500000,
    approverType: "Role",
    approverRoleId: "ROLE004",
    sequenceOrder: 1,
    activeFlag: true,
    createdBy: "John Doe",
    createdOn: "2024-01-10T09:30:00Z",
    lastModifiedBy: "John Doe",
    lastModifiedOn: "2024-01-10T09:30:00Z",
    changeHistory: [
      {
        auditId: "AUD004",
        approvalMatrixId: "AM003",
        action: "Created",
        changedBy: "John Doe",
        changedOn: "2024-01-10T09:30:00Z",
        fieldChanges: [],
        changeDescription: "Initial creation of high-value payment approval rule"
      }
    ]
  },
  {
    approvalMatrixId: "AM004",
    processType: "FeeWaiver",
    rangeMinXCD: 0,
    rangeMaxXCD: 1000,
    approverType: "Role",
    approverRoleId: "ROLE006",
    sequenceOrder: 1,
    activeFlag: true,
    createdBy: "Jane Smith",
    createdOn: "2024-01-12T08:00:00Z",
    lastModifiedBy: "Jane Smith",
    lastModifiedOn: "2024-01-12T08:00:00Z",
    changeHistory: [
      {
        auditId: "AUD005",
        approvalMatrixId: "AM004",
        action: "Created",
        changedBy: "Jane Smith",
        changedOn: "2024-01-12T08:00:00Z",
        fieldChanges: [],
        changeDescription: "Initial creation of fee waiver approval rule"
      }
    ]
  },
  {
    approvalMatrixId: "AM005",
    processType: "FeeWaiver",
    rangeMinXCD: 1001,
    rangeMaxXCD: 10000,
    approverType: "Role",
    approverRoleId: "ROLE004",
    sequenceOrder: 1,
    activeFlag: true,
    createdBy: "John Doe",
    createdOn: "2024-01-12T09:00:00Z",
    lastModifiedBy: "John Doe",
    lastModifiedOn: "2024-01-12T09:00:00Z",
    changeHistory: [
      {
        auditId: "AUD006",
        approvalMatrixId: "AM005",
        action: "Created",
        changedBy: "John Doe",
        changedOn: "2024-01-12T09:00:00Z",
        fieldChanges: [],
        changeDescription: "Initial creation of high-value fee waiver approval rule"
      }
    ]
  },
  {
    approvalMatrixId: "AM006",
    processType: "Journal",
    rangeMinXCD: 0,
    rangeMaxXCD: 999999999,
    approverType: "Role",
    approverRoleId: "ROLE003",
    sequenceOrder: 1,
    activeFlag: true,
    createdBy: "Jane Smith",
    createdOn: "2024-01-15T08:00:00Z",
    lastModifiedBy: "Jane Smith",
    lastModifiedOn: "2024-01-15T08:00:00Z",
    changeHistory: [
      {
        auditId: "AUD007",
        approvalMatrixId: "AM006",
        action: "Created",
        changedBy: "Jane Smith",
        changedOn: "2024-01-15T08:00:00Z",
        fieldChanges: [],
        changeDescription: "Initial creation of journal entry approval rule"
      }
    ]
  },
  {
    approvalMatrixId: "AM007",
    processType: "Refund",
    rangeMinXCD: 0,
    rangeMaxXCD: 10000,
    approverType: "Role",
    approverRoleId: "ROLE003",
    sequenceOrder: 1,
    activeFlag: true,
    createdBy: "John Doe",
    createdOn: "2024-01-18T10:00:00Z",
    lastModifiedBy: "John Doe",
    lastModifiedOn: "2024-01-18T10:00:00Z",
    changeHistory: [
      {
        auditId: "AUD008",
        approvalMatrixId: "AM007",
        action: "Created",
        changedBy: "John Doe",
        changedOn: "2024-01-18T10:00:00Z",
        fieldChanges: [],
        changeDescription: "Initial creation of refund approval rule"
      }
    ]
  },
  {
    approvalMatrixId: "AM008",
    processType: "WriteOff",
    rangeMinXCD: 0,
    rangeMaxXCD: 5000,
    approverType: "Role",
    approverRoleId: "ROLE003",
    sequenceOrder: 1,
    activeFlag: true,
    createdBy: "Jane Smith",
    createdOn: "2024-01-20T08:00:00Z",
    lastModifiedBy: "Jane Smith",
    lastModifiedOn: "2024-01-20T08:00:00Z",
    changeHistory: [
      {
        auditId: "AUD009",
        approvalMatrixId: "AM008",
        action: "Created",
        changedBy: "Jane Smith",
        changedOn: "2024-01-20T08:00:00Z",
        fieldChanges: [],
        changeDescription: "Initial creation of write-off approval rule"
      }
    ]
  },
];

export const workflowSchemes: WorkflowScheme[] = [
  {
    schemeId: "WF001",
    name: "Finance Payment Approval",
    moduleName: "Finance",
    description: "Approval workflow for all payment types including benefits, refunds, and supplier payments",
    isActive: true,
  },
  {
    schemeId: "WF002",
    name: "Fee Waiver Approval",
    moduleName: "Finance",
    description: "Approval workflow for fee and penalty waivers",
    isActive: true,
  },
  {
    schemeId: "WF003",
    name: "Journal Entry Approval",
    moduleName: "Finance",
    description: "Approval workflow for manual journal entries and GL adjustments",
    isActive: true,
  },
  {
    schemeId: "WF004",
    name: "Weekly Plan Approval",
    moduleName: "Compliance",
    description: "Approval workflow for inspector weekly audit plans",
    isActive: true,
  },
  {
    schemeId: "WF005",
    name: "Legal Referral Approval",
    moduleName: "Compliance",
    description: "Approval workflow for escalating cases to legal department",
    isActive: true,
  },
  {
    schemeId: "WF006",
    name: "Benefit Claim Approval",
    moduleName: "Benefits",
    description: "Approval workflow for benefit claims and payments",
    isActive: true,
  },
];

export const workflowSteps: WorkflowStep[] = [
  {
    stepId: "STEP001",
    schemeId: "WF001",
    stepNumber: 1,
    stepName: "Supervisor Review",
    approverType: "Supervisor",
    isFinalStep: false,
  },
  {
    stepId: "STEP002",
    schemeId: "WF001",
    stepNumber: 2,
    stepName: "Amount-Based Approval",
    approverType: "Matrix",
    approvalMatrixId: "AM001",
    isFinalStep: true,
  },
];
