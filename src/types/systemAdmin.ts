export interface Employee {
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  nationalIdSSN?: string;
  email: string;
  phone: string;
  employmentStatus: "Active" | "On Leave" | "Suspended" | "Terminated" | "Retired";
  hireDate: string;
  endDate?: string;
  location: string;
  zone?: string;
}

export interface UserAccount {
  userId: string;
  employeeId: string;
  isActive: boolean;
  authenticationType: "Local" | "AD" | "SSO";
  passwordLastChanged?: string;
  failedLoginCount: number;
  lastLoginDateTime?: string;
}

export interface OrgUnit {
  orgUnitId: string;
  name: string;
  type: "Division" | "Department" | "Unit" | "Branch" | "Office";
  parentOrgUnitId?: string;
  activeFlag: boolean;
  headPositionId?: string;
}

export interface Position {
  positionId: string;
  positionName: string;
  orgUnitId: string;
  gradeLevel: string;
  reportsToPositionId?: string;
  isManager: boolean;
  isApprover: boolean;
  defaultApprovalLimitXCD?: number;
  activeFlag: boolean;
}

export interface PositionAssignment {
  positionAssignmentId: string;
  positionId: string;
  employeeId: string;
  startDate: string;
  endDate?: string;
  isPrimary: boolean;
  isActing: boolean;
}

export interface Role {
  roleId: string;
  roleName: string;
  description: string;
  isSystemRole: boolean;
}

export interface Permission {
  permissionId: string;
  permissionKey: string;
  description: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
}

export interface RoleAssignment {
  roleAssignmentId: string;
  roleId: string;
  positionId?: string;
  userId?: string;
  startDate: string;
  endDate?: string;
}

export interface Delegation {
  delegationId: string;
  fromPositionId?: string;
  fromEmployeeId?: string;
  toPositionId?: string;
  toEmployeeId?: string;
  startDate: string;
  endDate: string;
  scope: string;
  maxApprovalLimitXCD?: number;
  reason: string;
  createdBy: string;
  createdOn: string;
}

export interface ApprovalMatrix {
  approvalMatrixId: string;
  processType: string;
  orgUnitId?: string;
  rangeMinXCD: number;
  rangeMaxXCD: number;
  approverType: "Role" | "Position";
  approverRoleId?: string;
  approverPositionId?: string;
  sequenceOrder: number;
  activeFlag: boolean;
  createdBy?: string;
  createdOn?: string;
  lastModifiedBy?: string;
  lastModifiedOn?: string;
  changeHistory?: ApprovalMatrixAudit[];
}

export interface ApprovalMatrixAudit {
  auditId: string;
  approvalMatrixId: string;
  action: "Created" | "Updated" | "Deleted" | "Activated" | "Deactivated";
  changedBy: string;
  changedOn: string;
  fieldChanges: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  changeDescription: string;
}

export interface WorkflowScheme {
  schemeId: string;
  name: string;
  moduleName: string;
  description: string;
  isActive: boolean;
}

export interface WorkflowStep {
  stepId: string;
  schemeId: string;
  stepNumber: number;
  stepName: string;
  approverType: "Supervisor" | "Role" | "Position" | "Matrix" | "Committee";
  approverRoleId?: string;
  approverPositionId?: string;
  approvalMatrixId?: string;
  conditionExpression?: string;
  isFinalStep: boolean;
}
