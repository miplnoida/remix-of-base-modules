export type NodeType = 'start' | 'task' | 'decision' | 'timer' | 'automation' | 'subflow' | 'end';
export type WorkflowStatus = 'Draft' | 'Active' | 'Archived';
export type RunStatus = 'Pending' | 'InProgress' | 'Completed' | 'Failed' | 'Cancelled';
export type StepStatus = 'Pending' | 'InProgress' | 'Completed' | 'Failed' | 'Skipped';
export type ActionKind = 'Email' | 'SMS' | 'Webhook' | 'DB' | 'Queue' | 'File';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  activeVersionNumber?: number;
  tags?: string[];
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNumber: number;
  changeDescription?: string;
  dataJson: string; // serialized graph
  createdBy: string;
  createdAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowVersionId: string;
  workflowName: string;
  startedBy: string;
  startedByName: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
  currentStep?: string;
}

export interface WorkflowRunStep {
  id: string;
  runId: string;
  nodeId: string;
  nodeType: NodeType;
  name: string;
  status: StepStatus;
  assignedTo?: string;
  assignedToName?: string;
  startedAt?: string;
  completedAt?: string;
  resultJson?: string;
  notes?: string;
}

export interface WorkflowFormSubmission {
  id: string;
  runId: string;
  stepId: string;
  stepName: string;
  formData: Record<string, any>;
  submittedBy?: string;
  submittedByName?: string;
  createdAt: string;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'email' | 'date' | 'select' | 'multiselect' | 'textarea' | 'checkbox' | 'file';
  required: boolean;
  helpText?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    regex?: string;
    mask?: string;
  };
  conditionalVisibility?: {
    field: string;
    operator: string;
    value: any;
  };
}

export interface TaskNodeData {
  label: string;
  description?: string;
  assignTo?: string; // role or user
  fields: FormField[];
  sla?: {
    hours: number;
    escalateTo?: string;
  };
}

export interface DecisionNodeData {
  label: string;
  conditions: {
    groups: {
      operator: 'AND' | 'OR';
      rules: {
        field: string;
        operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
        value: any;
      }[];
    }[];
  };
}

export interface AutomationNodeData {
  label: string;
  actionKind: ActionKind;
  config: Record<string, any>;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: TaskNodeData | DecisionNodeData | AutomationNodeData | { label: string; description?: string };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
