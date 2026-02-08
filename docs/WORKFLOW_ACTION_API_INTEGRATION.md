# Workflow Action API Integration - Developer Guide

## Overview

This feature enables fully configurable, workflow-driven API integrations. When an admin performs actions like Approve, Reject, or Schedule-Meeting on a registration request, the system automatically calls a configured external API to sync the status with the Public Portal.

## Key Principles

1. **Configuration over Code**: All API endpoints, methods, and body mappings are stored in the database
2. **Loose Coupling**: Admin Portal communicates with Public Portal only through configured APIs
3. **Workflow-Driven**: API calls are triggered by workflow actions, not UI logic
4. **Auditability**: Every API call is logged with request/response details
5. **Fault Tolerance**: Workflow actions complete even if API calls fail

## Database Tables

### workflow_step_action_api
Defines which API to call for a workflow action.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workflow_id | UUID | Reference to workflow_definitions |
| workflow_step_id | UUID | Reference to workflow_steps |
| action_code | TEXT | Action type: Approve, Reject, ScheduleMeeting |
| http_method | TEXT | POST, PUT, PATCH, GET, DELETE |
| endpoint_url | TEXT | API endpoint (supports {{placeholders}}) |
| api_key_secret_name | TEXT | Name of secret in Supabase Secrets |
| content_type | TEXT | Default: application/json |
| timeout_seconds | INTEGER | Request timeout (default: 30) |
| retry_count | INTEGER | Auto-retry count (default: 0) |
| is_active | BOOLEAN | Enable/disable the integration |

### workflow_step_action_api_body
Defines dynamic request body field mappings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workflow_action_api_id | UUID | Reference to workflow_step_action_api |
| json_field_name | TEXT | JSON field in request body |
| value_source | TEXT | APPLICATION, MEETING, WORKFLOW, SYSTEM, STATIC |
| source_key | TEXT | Key to extract value from source |
| static_value | TEXT | Fixed value (when value_source is STATIC) |

### workflow_api_execution_log
Audit trail for all API executions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workflow_instance_id | UUID | Reference to workflow instance |
| action_code | TEXT | Action that triggered the call |
| endpoint_url | TEXT | Resolved endpoint URL |
| request_payload | JSONB | Request body sent |
| response_payload | JSONB | Response received |
| http_status | INTEGER | HTTP status code |
| execution_status | TEXT | SUCCESS, FAILED, TIMEOUT |
| error_message | TEXT | Error details if failed |
| duration_ms | INTEGER | Execution time |

## Value Sources

| Source | Description | Example Keys |
|--------|-------------|--------------|
| APPLICATION | Data from the source record | application_reference_no, ssn, email |
| MEETING | Data from scheduled meeting | meeting_date, meeting_time, office_address |
| WORKFLOW | Workflow context data | action_code, instance_id, user_remarks |
| SYSTEM | System-generated values | logged_in_user, current_timestamp |
| STATIC | Fixed/constant value | Any static text |

## Example Configuration

### Employer Registration - Approve Action

**API Configuration:**
```json
{
  "workflow_id": "employer-registration-workflow-id",
  "workflow_step_id": "initial-review-step-id",
  "action_code": "Approve",
  "http_method": "POST",
  "endpoint_url": "https://portal.example.com/api/applications/status",
  "api_key_secret_name": "PUBLIC_PORTAL_API_KEY",
  "content_type": "application/json"
}
```

**Body Mappings:**
```json
[
  { "json_field_name": "application_reference_number", "value_source": "APPLICATION", "source_key": "application_reference_no" },
  { "json_field_name": "action", "value_source": "STATIC", "static_value": "APPROVED" },
  { "json_field_name": "action_by", "value_source": "SYSTEM", "source_key": "logged_in_user" },
  { "json_field_name": "action_at", "value_source": "SYSTEM", "source_key": "current_timestamp" },
  { "json_field_name": "remarks", "value_source": "WORKFLOW", "source_key": "user_remarks" }
]
```

**Generated Payload:**
```json
{
  "application_reference_number": "EMP-2026-000123",
  "action": "APPROVED",
  "action_by": "USER001",
  "action_at": "2026-02-08T14:20:00Z",
  "remarks": "All documents verified successfully"
}
```

## Edge Function: workflow-action-api

### Actions

**execute** - Execute configured API call
```typescript
{
  action: 'execute',
  workflowId: 'uuid',
  workflowStepId: 'uuid',
  workflowInstanceId: 'uuid',
  taskId: 'uuid',
  actionCode: 'Approve',
  applicationData: { ... },
  meetingData: { ... },
  workflowContext: { ... }
}
```

**get_config** - Get API configuration
```typescript
{
  action: 'get_config',
  workflowId: 'uuid',
  workflowStepId: 'uuid',
  actionCode: 'Approve'
}
```

**retry** - Retry a failed execution
```typescript
{
  action: 'retry',
  executionLogId: 'uuid'
}
```

## Security Requirements

1. **API Keys**: Stored ONLY in Supabase Secrets, never in database or UI
2. **Logging**: API keys are NEVER included in logs
3. **Transport**: All API calls use HTTPS
4. **Validation**: Request payloads validated before sending

## UI Components

### WorkflowActionApiConfig
Configuration form for setting up API integrations per workflow step/action.

```tsx
import { WorkflowActionApiConfig } from '@/components/workflow/WorkflowActionApiConfig';

<WorkflowActionApiConfig
  workflowId="workflow-uuid"
  stepId="step-uuid"
  stepName="Initial Review"
  actionCode="Approve"
  actionName="Approve Application"
  onSaved={() => console.log('Config saved')}
/>
```

### WorkflowApiExecutionLogs
Display execution logs for a workflow instance with retry capability.

```tsx
import { WorkflowApiExecutionLogs } from '@/components/workflow/WorkflowApiExecutionLogs';

<WorkflowApiExecutionLogs instanceId="instance-uuid" />
```

## Hooks

### useWorkflowActionApiConfig
Fetch API configuration for a specific action.

### useWorkflowApiConfigs
Fetch all API configurations for a workflow.

### useWorkflowApiExecutionLogs
Fetch execution logs for a workflow instance.

### useSaveWorkflowActionApiConfig
Save or update API configuration.

### useRetryWorkflowApiExecution
Retry a failed API execution.

## Adding a New Integration

1. Navigate to Workflow Management
2. Select the workflow
3. For each step, click "Configure API" on the desired action
4. Fill in the API details:
   - HTTP Method and Endpoint URL
   - API Key Secret Name (must exist in Supabase Secrets)
   - Body field mappings
5. Save the configuration
6. Test by executing the workflow action

## Troubleshooting

### API call failed but workflow completed
This is by design. Check the execution logs for error details and use the retry button.

### Secret not found
Ensure the secret is added to Supabase Secrets with the exact name specified in api_key_secret_name.

### Timeout errors
Increase the timeout_seconds value in the configuration or check the external API performance.

### Missing data in payload
Verify the source_key matches the actual field name in the source data. Check console logs for available fields.
