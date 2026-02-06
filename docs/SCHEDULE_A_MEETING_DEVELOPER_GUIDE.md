# Schedule-A-Meeting Feature - Developer Guide

## Overview

The **Schedule-A-Meeting** feature is a fully configurable, workflow-driven meeting scheduling system that can be reused across multiple application modules (IP-Registration, Employer-Registration, Doctor-Registration, etc.). All logic is database-driven with no hard-coded business rules in UI or backend services.

## Architecture

### Design Principles

1. **Configuration-Driven**: All meeting behavior is controlled via database tables
2. **Workflow Integration**: Meetings pause workflows and resume based on outcomes
3. **Third-Party API Support**: Configurable external API calls for notifications
4. **Full Auditability**: Complete history and API call logging
5. **Reusability**: Same action type works for any workflow in the system

### Database Schema

```
┌─────────────────────────────┐
│   workflow_action_types     │ ◄── Master table of action types
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│ workflow_action_configurations  │ ◄── Links steps to Schedule-A-Meeting
└─────────────────────────────────┘
              │
              ├───────────────────────────────┐
              ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ workflow_action_outcomes    │   │ workflow_api_configurations │
│ (Approve, Reject, etc.)     │   │ (External API definitions)  │
└─────────────────────────────┘   └─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│         meetings            │ ◄── Core meeting records
└─────────────────────────────┘
              │
              ├─────────────────────────────────┐
              ▼                                 ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│      meeting_history        │   │      meeting_api_logs       │
│ (Status change audit trail) │   │ (Third-party API call logs) │
└─────────────────────────────┘   └─────────────────────────────┘
```

## Database Tables

### 1. `workflow_action_types`

Master table defining all available workflow action types.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type_code | VARCHAR(50) | Unique identifier (e.g., 'ScheduleMeeting') |
| type_name | VARCHAR(100) | Display name |
| description | TEXT | Description of the action type |
| requires_form | BOOLEAN | Whether action needs user input form |
| requires_api_integration | BOOLEAN | Whether action can call external APIs |
| pauses_workflow | BOOLEAN | Whether action pauses workflow progression |
| is_system_defined | BOOLEAN | Whether type is system-managed |
| is_active | BOOLEAN | Enable/disable flag |

### 2. `workflow_action_configurations`

Links workflow steps to configurable action types.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workflow_id | UUID | Reference to workflow definition |
| step_id | UUID | Reference to workflow step |
| action_type_id | UUID | Reference to workflow_action_types |
| action_id | UUID | Optional reference to workflow_step_actions |
| meeting_type | ENUM | IP-Registration, Employer-Registration, Doctor-Registration, General |
| requires_api_integration | BOOLEAN | Whether to call external API |
| api_config_id | UUID | Reference to API configuration |
| custom_config | JSONB | Additional configuration options |

### 3. `workflow_api_configurations`

Defines external API call specifications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| config_name | VARCHAR(100) | Configuration name |
| http_method | VARCHAR(10) | GET, POST, PUT, PATCH, DELETE |
| endpoint_url | TEXT | API endpoint (supports placeholders) |
| secret_name | VARCHAR(100) | Name of secret in Supabase Vault |
| timeout_seconds | INTEGER | Request timeout |
| retry_count | INTEGER | Number of retry attempts |
| headers_template | JSONB | Headers with placeholder support |
| body_template | JSONB | Request body with placeholder support |
| success_condition | JSONB | Conditions to determine success |

**Supported Placeholders:**
- `{{applicationReference}}` - Application reference number
- `{{meetingReference}}` - Meeting reference number
- `{{meetingDate}}` - Meeting date
- `{{meetingTime}}` - Meeting time
- `{{officeAddress}}` - Office address
- `{{remarks}}` - Meeting remarks
- `{{apiKey}}` - API key from secrets

### 4. `workflow_action_outcomes`

Defines possible outcomes for meetings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| action_config_id | UUID | Reference to action configuration |
| outcome_code | ENUM | ClosedWithApproval, ClosedWithRejection, Reschedule, NextSchedule, Cancel |
| outcome_label | VARCHAR(100) | Button label displayed to user |
| description | TEXT | Tooltip/description |
| icon_name | VARCHAR(50) | Icon to display |
| button_variant | VARCHAR(20) | default, destructive, outline, secondary |
| next_step_type | VARCHAR(20) | 'stay', 'next', or 'end' |
| next_step_id | UUID | Next step if next_step_type = 'next' |
| end_state | ENUM | Approved or Rejected if workflow ends |
| triggers_api | BOOLEAN | Whether to call external API |
| api_config_id | UUID | API configuration to use |
| creates_new_request | BOOLEAN | Whether to create new application |
| new_request_module | VARCHAR(100) | Module for new application |
| requires_remarks | BOOLEAN | Whether remarks are mandatory |

### 5. `meetings`

Core meeting records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| meeting_reference | VARCHAR(20) | Unique reference (MTG-YYYY-NNNNNN) |
| application_reference | VARCHAR(50) | Related application reference |
| workflow_instance_id | UUID | Workflow instance that created meeting |
| workflow_id | UUID | Workflow definition |
| step_id | UUID | Step that triggered meeting |
| action_config_id | UUID | Action configuration used |
| meeting_type | ENUM | Type of meeting |
| status | ENUM | Scheduled, Rescheduled, InProgress, Closed, Cancelled, Rejected |
| outcome | ENUM | Outcome code when closed |
| meeting_date | DATE | Scheduled date |
| meeting_time | TIME | Scheduled time |
| contact_person | VARCHAR(100) | Contact name |
| contact_email | VARCHAR(100) | Contact email |
| contact_phone | VARCHAR(20) | Contact phone |
| office_address | TEXT | Meeting location |
| remarks | TEXT | Initial remarks |
| outcome_remarks | TEXT | Remarks when closed |
| parent_meeting_id | UUID | For rescheduled meetings |
| reschedule_count | INTEGER | Number of times rescheduled |
| api_notified | BOOLEAN | Whether API was called |
| api_notification_at | TIMESTAMP | When API was called |

### 6. `meeting_history`

Complete audit trail of meeting changes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| meeting_id | UUID | Reference to meeting |
| old_status | ENUM | Previous status |
| new_status | ENUM | New status |
| action_taken | VARCHAR(50) | Action performed |
| outcome | ENUM | Outcome if applicable |
| old_date | DATE | Previous date (if rescheduled) |
| new_date | DATE | New date (if rescheduled) |
| remarks | TEXT | Notes about change |
| performed_by | UUID | User who made change |
| performed_by_name | VARCHAR(100) | User display name |
| performed_at | TIMESTAMP | When change occurred |

### 7. `meeting_api_logs`

Record of all external API calls.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| meeting_id | UUID | Reference to meeting |
| api_config_id | UUID | API configuration used |
| action_type | VARCHAR(50) | SCHEDULED, CLOSED, CANCELLED, etc. |
| request_url | TEXT | Actual URL called |
| request_method | VARCHAR(10) | HTTP method |
| request_headers | JSONB | Headers sent |
| request_payload | JSONB | Body sent |
| response_status | INTEGER | HTTP response code |
| response_payload | JSONB | Response body |
| is_success | BOOLEAN | Whether call succeeded |
| error_message | TEXT | Error if failed |
| duration_ms | INTEGER | Call duration |

## Backend API

### Edge Function: `meeting-api-handler`

All meeting operations go through this single edge function.

#### Actions

1. **schedule** - Create a new meeting
```typescript
{
  action: 'schedule',
  applicationReference: 'IP-REG-2026-000123',
  workflowInstanceId: 'uuid',
  workflowId: 'uuid',
  stepId: 'uuid',
  actionConfigId: 'uuid',
  meetingType: 'IP-Registration',
  meetingDate: '2026-02-15',
  meetingTime: '09:00',
  contactPerson: 'John Smith',
  contactEmail: 'john@example.com',
  officeAddress: 'Main Office, St. Kitts',
  remarks: 'Initial consultation'
}
```

2. **process_outcome** - Close/reschedule a meeting
```typescript
{
  action: 'process_outcome',
  meetingId: 'uuid',
  outcome: 'ClosedWithApproval',
  remarks: 'Documents verified',
  newDate: '2026-02-20', // For reschedule
  newTime: '14:00'       // For reschedule
}
```

3. **get_meetings** - List meetings with filters
```typescript
{
  action: 'get_meetings',
  filters: {
    status: 'Scheduled',
    meetingType: 'IP-Registration',
    dateFrom: '2026-02-01',
    dateTo: '2026-02-28'
  }
}
```

4. **get_meeting_details** - Get single meeting with history
```typescript
{
  action: 'get_meeting_details',
  meetingId: 'uuid'
}
```

5. **call_external_api** - Manually trigger API call
```typescript
{
  action: 'call_external_api',
  meetingId: 'uuid',
  apiConfigId: 'uuid'
}
```

### Database Functions

1. **generate_meeting_reference()** - Generates unique reference MTG-YYYY-NNNNNN
2. **schedule_meeting(...)** - Creates meeting record, history, updates workflow status
3. **process_meeting_outcome(...)** - Closes meeting, creates rescheduled meeting if needed, advances workflow

## Frontend Components

### 1. ScheduleMeetingDialog

Dialog for scheduling a new meeting.

```tsx
import { ScheduleMeetingDialog } from '@/components/meetings';

<ScheduleMeetingDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  applicationReference="IP-REG-2026-000123"
  meetingType="IP-Registration"
  workflowInstanceId="uuid"
  workflowId="uuid"
  stepId="uuid"
  actionConfigId="uuid"
  onSuccess={(data) => console.log('Meeting scheduled:', data)}
/>
```

### 2. MeetingOutcomeButtons

Dynamic action buttons based on workflow configuration.

```tsx
import { MeetingOutcomeButtons } from '@/components/meetings';

<MeetingOutcomeButtons
  meetingId="uuid"
  outcomes={outcomeConfigs}
  currentStatus="Scheduled"
  onOutcomeProcessed={() => refetch()}
/>
```

### 3. MeetingDetailView

Complete meeting view with history and API logs.

```tsx
import { MeetingDetailView } from '@/components/meetings';

<MeetingDetailView
  meetingId="uuid"
  onClose={() => setDialogOpen(false)}
/>
```

### 4. ManageMeetingsPage

Full-page meeting management with filtering.

Route: `/meetings/manage`

## Hooks

### useMeetings
```typescript
const { data: meetings, isLoading, refetch } = useMeetings({
  status: 'Scheduled',
  meetingType: 'IP-Registration',
  dateFrom: '2026-02-01',
  dateTo: '2026-02-28'
});
```

### useTodaysMeetings
```typescript
const { data: todaysMeetings } = useTodaysMeetings();
```

### useMeetingDetails
```typescript
const { data: { meeting, history, outcomes, apiLogs } } = useMeetingDetails(meetingId);
```

### useScheduleMeeting
```typescript
const scheduleMutation = useScheduleMeeting();
await scheduleMutation.mutateAsync(formData);
```

### useProcessMeetingOutcome
```typescript
const processOutcome = useProcessMeetingOutcome();
await processOutcome.mutateAsync({ meetingId, outcome, remarks });
```

## Workflow Integration

### Adding Schedule-A-Meeting to a Workflow Step

1. Add a step action with type `ScheduleMeeting` in `workflow_step_actions`
2. Create a configuration in `workflow_action_configurations`
3. Define outcomes in `workflow_action_outcomes`
4. Optionally configure API integration in `workflow_api_configurations`

### Workflow Status Flow

```
Normal Workflow Flow → Step with ScheduleMeeting Action
                                    │
                                    ▼
                        Workflow Status: 'AwaitingMeeting'
                                    │
                                    ▼
                            Meeting Created
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ClosedWithApproval   Reschedule    ClosedWithRejection
                    │               │               │
                    ▼               ▼               ▼
            Advance to Next    Stay at Step    End Workflow
               Step              (New Meeting)   (Rejected)
```

## Global Settings

The feature uses the following system settings:

| Setting Key | Description |
|-------------|-------------|
| `default_office_address` | Default office address for meetings |

## Security

- All API calls executed server-side via Supabase Edge Functions
- API keys stored only in Supabase secrets, never exposed to frontend
- RLS policies protect all meeting tables
- Complete audit trail in `meeting_history` and `meeting_api_logs`

## Future Enhancements

1. **Calendar Integration** - Sync with Google/Outlook calendars
2. **SMS Reminders** - Automated meeting reminders
3. **Video Meeting Links** - Generate Zoom/Teams links
4. **Attendee Management** - Multiple attendees per meeting
5. **Recurring Meetings** - Support for recurring schedules

## Usage Example: IP Registration Workflow

```sql
-- 1. Get the ScheduleMeeting action type
SELECT id FROM workflow_action_types WHERE type_code = 'ScheduleMeeting';

-- 2. Create action configuration for IP Registration workflow step
INSERT INTO workflow_action_configurations (
  workflow_id, step_id, action_type_id, meeting_type, requires_api_integration
) VALUES (
  'ip-registration-workflow-id',
  'verification-step-id',
  'schedule-meeting-action-type-id',
  'IP-Registration',
  true
);

-- 3. Add outcomes
INSERT INTO workflow_action_outcomes (
  action_config_id, outcome_code, outcome_label, next_step_type, end_state
) VALUES 
  ('config-id', 'ClosedWithApproval', 'Approve', 'end', 'Approved'),
  ('config-id', 'ClosedWithRejection', 'Reject', 'end', 'Rejected'),
  ('config-id', 'Reschedule', 'Reschedule Meeting', 'stay', NULL);
```

## Troubleshooting

### Meeting Not Advancing Workflow
- Check `workflow_action_outcomes` has correct `next_step_type` and `next_step_id`
- Verify workflow instance status is 'AwaitingMeeting'

### External API Not Called
- Verify `requires_api_integration` is true in `workflow_action_configurations`
- Check `api_config_id` is set
- Review `meeting_api_logs` for error messages
- Ensure secret is properly configured in Supabase

### Meeting History Not Recording
- Check RLS policies on `meeting_history` table
- Verify trigger functions are active
