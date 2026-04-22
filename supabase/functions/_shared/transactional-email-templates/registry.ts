/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as plannerApprovalRequest } from './planner-approval-request.tsx'
import { template as plannerApprovalGranted } from './planner-approval-granted.tsx'
import { template as plannerApprovalRejected } from './planner-approval-rejected.tsx'
import { template as plannerApprovalEscalation } from './planner-approval-escalation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'planner-approval-request': plannerApprovalRequest,
  'planner-approval-granted': plannerApprovalGranted,
  'planner-approval-rejected': plannerApprovalRejected,
  'planner-approval-escalation': plannerApprovalEscalation,
}
