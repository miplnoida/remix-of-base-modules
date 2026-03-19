

# Generate Complete Internal Audit Module Documentation

## What This Does

Produces a comprehensive `.md` documentation file covering the entire Internal Audit module as it exists today in the SSB Admin system. This consolidates information from the existing `INTERNAL-AUDIT-MODULE-DOCUMENTATION.md` (v2.0), the Audit Guardian reference guide, the live database schema (60 tables), all 40 page files, 17 components, 12+ hooks, 2 edge functions, and the notification service.

## Document Structure

The generated file will be saved to `/mnt/documents/INTERNAL-AUDIT-COMPLETE-DOCUMENTATION.md` and will contain:

1. **Executive Summary** — Module purpose, key capabilities, current status
2. **Technology Stack** — React/TypeScript/Vite, Lovable Cloud, Resend, Realtime
3. **Data Hierarchy** — Office → Department → Function → Risk → Plan → Engagement → Activity → Finding → Action → Closure
4. **Complete Database Schema** — All 60 `ia_*` tables with columns, types, defaults, and relationships
5. **Screen Inventory** — All 40 pages with routes, permissions, categories, and feature flags
6. **Component Inventory** — All 17 audit components with purpose
7. **Hook Inventory** — All 12+ hooks with CRUD patterns
8. **Audit Lifecycle Workflow** — Full status flows for plans, engagements, findings, actions
9. **Risk Assessment & Scoring** — Weighted scoring, RCM, historical adjustments, configurable scales
10. **Audit Planning** — Annual plans, department audits, ad-hoc audits, plan amendments, change log
11. **Engagement Workspace (Digital Audit File)** — 14-tab workspace, lifecycle stepper, work programs, testing procedures
12. **Approval Workflow** — Multi-step approval with department acceptance
13. **Audit Preparation** — Checklists, documents, team tabs
14. **Audit Execution** — Activities, calendar, evidence, working papers, control testing
15. **Issue Management** — Findings (CCCE), auto-action generation, management responses, follow-ups
16. **Engagement Closure** — Closure validation, quality review, electronic signatures
17. **Reporting & Dashboards** — Executive dashboard, risk heat map, timeline, report builder, committee reports
18. **Communication & Collaboration** — Discussion threads, realtime, @mentions, letter generation, templates
19. **Email Notifications** — Notification service, lifecycle triggers, automated due-date reminders
20. **RBAC & Permissions** — Role hierarchy, permission matrix, audit trail standards
21. **Edge Functions** — `send-notification`, `audit-due-date-reminders`
22. **Feature Flags** — All 34 flags from `auditRouteConfig.ts`
23. **File Structure** — Complete inventory of pages, components, hooks, services, config
24. **Roadmap** — Planned features: Amendment Approval Workflow, Auditee Portal, Email Queue, Gantt Chart

## Key Updates vs Existing Documentation

The new file will include recent additions not in the current v2.0 doc:
- `ia_plan_change_log` table and hook
- `engagement_type` field on engagements (5 types)
- `AuditPlanDetail.tsx` page with plan-level engagement management
- `AddEngagementToPlanForm.tsx` component
- Work Program system (`ia_work_programs`, `ia_work_program_steps`, `ia_testing_procedures` — hooks exist, tables pending)
- Engagement Closure system (`ia_engagement_closure` — hook exists, table pending)
- `LifecycleStepper` and `EngagementClosurePanel` components
- `EngagementDetail.tsx` 14-tab workspace
- `WorkProgramPanel.tsx`
- `EngagementFilterBanner.tsx`
- Updated engagement lifecycle: Planned → Fieldwork → Observation → Reporting → Closure

## Implementation

Single script execution to write the consolidated markdown file based on all gathered data. No code changes to the application.

