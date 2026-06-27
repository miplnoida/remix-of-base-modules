# Administration Audit — Complete Page Inventory

> **Generated from:** `src/config/routes.ts`, `src/components/routing/AppRoutes.tsx`, `find src/pages/admin -type f`, `src/components/sidebar/menuItems/*`, `src/components/sidebar/DynamicSidebarContent.tsx`, `src/hooks/useNavigationMenu.ts`, `src/lib/enterprise/*`
>
> **`app_modules` DB shape** (from `useNavigationMenu.ts`): `id`, `name`, `display_name`, `description`, `icon` (Lucide name string), `route`, `parent_id`, `sort_order`, `is_enabled`, `show_in_menu`

---

## 1. Recommended New Groups (legend)

| Code | Group Name |
|---|---|
| **ORG** | Organization Management |
| **IDS** | Identity & Security |
| **MD** | Master Data |
| **WFA** | Workflow & Automation |
| **CDE** | Communication & Document Engine |
| **INT** | Integrations |
| **SYS** | System Administration |

---

## 2. Full Page Inventory Table

### 2A — Users & Roles (Identity & Security)

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| User Management | `/admin/users` | System Administration (sidebar) | `src/pages/admin/users/UserList.tsx` | List all system users with search/filter | **Keep** | — | `UserManagementAdmin` (partial overlap) | **IDS** |
| Create User | `/admin/users/create` | System Administration | `src/pages/admin/users/UserCreate.tsx` | New user creation form | **Keep** | — | — | **IDS** |
| View User | `/admin/users/:userId` | System Administration | `src/pages/admin/users/UserView.tsx` | Read-only user detail | **Keep** | — | — | **IDS** |
| Edit User | `/admin/users/:userId/edit` | System Administration | `src/pages/admin/users/UserEdit.tsx` | Edit user profile | **Keep** | — | — | **IDS** |
| User Roles | `/admin/users/:userId/roles` | System Administration | `src/pages/admin/users/UserRoles.tsx` | Assign roles to a single user | **Keep** | — | — | **IDS** |
| Update User Password | `/admin/users/update-password` | System Administration | `src/pages/admin/users/UpdateUserPassword.tsx` | Admin-force password reset | **Keep** | — | — | **IDS** |
| User Management (legacy) | `/admin` (root redirect) | System Administration | `src/pages/admin/UserManagementAdmin.tsx` | Older user management tab view | **Merge** | `users/UserList` | `users/UserList.tsx` | **IDS** |
| Web Users | `/admin/web-users` | System Administration | `src/pages/systemAdmin/WebUsers` *(external)* | Portal-linked external user list | **Keep** | — | — | **IDS** |
| Seed Test Users | `/admin/seed-test-users` | None (orphan) | `src/pages/admin/SeedTestUsers.tsx` | Dev-only: seed fixture users | **Delete** (non-prod) | — | — | **SYS** |
| Roles & Permissions | `/admin/roles` | System Administration, userMenuItems | `src/pages/admin/roles/RoleList.tsx` | Manage role definitions | **Keep** | — | — | **IDS** |
| Role Permissions | `/admin/roles-permissions` | userMenuItems | `src/pages/admin/RolePermissionManagement.tsx` | Assign module/action permissions to roles | **Merge** | `RoleList` (tab) | — | **IDS** |
| Role Hierarchy | `/admin/role-hierarchy` | None (orphan) | `src/pages/admin/RoleHierarchy.tsx` | Visual tree of role inheritance | **Merge** | `RoleList` (tab) | — | **IDS** |
| Password Policy | `/admin/security/password-policy` | System Administration, userMenuItems | `src/pages/admin/security/PasswordPolicySettings.tsx` | Password complexity & expiry rules | **Keep** | — | — | **IDS** |
| MFA Settings | `/admin/security/mfa` | System Administration, userMenuItems | `src/pages/admin/security/MFASettings.tsx` | Enforce/configure MFA per role | **Keep** | — | — | **IDS** |
| Security Policy | `/admin/security/policy` | System Administration | `src/pages/admin/security/SecurityPolicySettings.tsx` | Rate limits, lockout thresholds, session TTL | **Keep** | — | — | **IDS** |
| IP Access Rules | `/admin/security/ip-access` | System Administration, userMenuItems | `src/pages/admin/security/IPAccessRulesManagement.tsx` | Whitelist/range rules for IP-based access | **Merge** | `OfficeIPManagement` | `OfficeIPManagement.tsx` | **IDS** |
| Office IP Management | `/admin/office-ip-management` | System Administration | `src/pages/admin/OfficeIPManagement.tsx` | Per-office IP whitelist overrides | **Merge** | `IPAccessRulesManagement` | `security/IPAccessRulesManagement.tsx` | **IDS** |
| Security Settings (legacy) | `/admin/security` | AppRoutes direct | `src/pages/systemAdmin/SecuritySettings` *(external)* | Older security settings shell | **Delete** / redirect to `/admin/security/policy` | — | `SecurityPolicySettings` | **IDS** |
| Data Scope Rules | `/admin/data-access/scope-rules` | None (orphan) | `src/pages/admin/data-access/DataScopeRules.tsx` | Row-level filter policies | **Keep** | — | — | **IDS** |
| Field Security | `/admin/data-access/field-security` | None (orphan) | `src/pages/admin/data-access/FieldSecurity.tsx` | Column-level visibility masks | **Keep** | — | — | **IDS** |
| Role Data Policies | `/admin/data-access/role-policies` | None (orphan) | `src/pages/admin/data-access/RoleDataPolicies.tsx` | Bind data scope rules to roles | **Keep** | — | — | **IDS** |
| User Data Overrides | `/admin/data-access/user-overrides` | None (orphan) | `src/pages/admin/data-access/UserDataOverrides.tsx` | Per-user data policy overrides | **Keep** | — | — | **IDS** |
| Policy Test Console | `/admin/data-access/test-console` | None (orphan) | `src/pages/admin/data-access/PolicyTestConsole.tsx` | Simulate data-access policy results | **Keep** | — | — | **IDS** |

---

### 2B — Organization Management

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| Organization Profile | `/admin/organization/profile` | None (orphan route) | `src/pages/admin/organization/OrganizationProfilePage.tsx` | Core org settings: name, logo, contact, tax | **Keep** | — | — | **ORG** |
| Locations | `/admin/organization/locations` | None (orphan route) | `src/pages/admin/organization/LocationsPage.tsx` | Manage physical locations / branches | **Merge** | `OfficeManagement` | `OfficeManagement.tsx` | **ORG** |
| Office Management | `/admin/offices` | System Administration | `src/pages/admin/OfficeManagement.tsx` | Manage office records (name, code, address) | **Merge** | `LocationsPage` | `organization/LocationsPage.tsx` | **ORG** |
| Department Profiles | `/admin/organization/departments` | None (orphan route) | `src/pages/admin/organization/DepartmentProfilesPage.tsx` | Comm/doc profile overrides per department | **Merge** | `DepartmentManagement` (tab) | — | **ORG** |
| Department Mapping | `/admin/organization/department-mapping` | None (orphan route) | `src/pages/admin/organization/DepartmentMappingPage.tsx` | Map legacy departments to org units | **Keep** | — | — | **ORG** |
| Department Management | `/admin/departments` | System Administration | `src/pages/admin/DepartmentManagement.tsx` | CRUD departments; links to offices | **Merge** | `DepartmentProfilesPage` (tab) | `organization/DepartmentProfilesPage.tsx` | **ORG** |
| Designation Management | `/admin/designations` | System Administration | `src/pages/admin/DesignationManagement.tsx` | CRUD job designations | **Merge** | `DesignationHierarchy` (tab) | `DesignationHierarchy.tsx` | **ORG** |
| Designation Hierarchy | `/admin/designation-hierarchy` | None (orphan) | `src/pages/admin/DesignationHierarchy.tsx` | Visual tree of designation levels | **Merge** | `DesignationManagement` | `DesignationManagement.tsx` | **ORG** |
| Designation Master | `/admin/master-data/designations` | Master Data menu | `src/pages/admin/master-data/DesignationMasterManagement.tsx` | Third designations surface (lookup table) | **Merge** | `DesignationManagement` | `DesignationManagement.tsx` + `DesignationHierarchy.tsx` | **ORG** |
| Portal Branding | `/admin/organization/portal-branding` | None (orphan route) | `src/pages/admin/organization/PortalBrandingPage.tsx` | Theme colors, fonts, logos for portal | **Keep** | — | — | **ORG** |
| Enterprise Health | `/admin/organization/enterprise-health` | None (orphan route) | `src/pages/admin/organization/EnterpriseHealthPage.tsx` | Config completeness & health dashboard | **Keep** | — | — | **ORG** |
| Usage Validation | `/admin/organization/usage` | None (orphan route) | `src/pages/admin/organization/UsageValidationPage.tsx` | Validate config asset usage across modules | **Keep** | — | — | **ORG** |
| Module Registry | `/admin/organization/modules` | None (orphan route) | `src/pages/admin/organization/ModuleRegistryPage.tsx` | Org-scoped module enable/disable registry | **Merge** | `ModuleManagement` | `ModuleManagement.tsx` | **ORG** |
| Module Management | `/admin/modules` | System Administration | `src/pages/admin/ModuleManagement.tsx` | Global app_modules CRUD & sort order | **Merge** | `ModuleRegistryPage` | `organization/ModuleRegistryPage.tsx` | **ORG** |
| Module Button Bindings | `/admin/module-button-bindings` | None (orphan) | `src/pages/admin/ModuleButtonBindings.tsx` | Bind action buttons to modules/permissions | **Keep** | — | — | **ORG** |

---

### 2C — Communication & Document Engine

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| Communication Assets | `/admin/communication` | None (orphan) | `src/pages/admin/communication/CommunicationAssetsAdmin.tsx` | Manage `comm_asset` records (logos, signatures, stamps) | **Keep** | — | Partial overlap with `organization/DocumentAssetsPage` | **CDE** |
| Communication Assets (org) | `/admin/organization/communication-assets` | None (orphan) | `src/pages/admin/communication/CommunicationAssetsAdmin.tsx` *(same component)* | Alias route — same page as above | **Delete** (alias) | `/admin/communication` | `CommunicationAssetsAdmin.tsx` | **CDE** |
| Document Assets | `/admin/organization/document-assets` | None (orphan route) | `src/pages/admin/organization/DocumentAssetsPage.tsx` | Manage document-bound asset slots | **Merge** | `CommunicationAssetsAdmin` (tab) | `CommunicationAssetsAdmin.tsx` | **CDE** |
| Letterheads | `/admin/organization/letterheads` | None (orphan route) | `src/pages/admin/organization/LetterheadsPage.tsx` | Upload/manage letterhead images per dept | **Merge** | `CommunicationAssetsAdmin` | — | **CDE** |
| Media Library | `/admin/organization/media-library` | None (orphan route) | `src/pages/admin/organization/MediaLibraryPage.tsx` | Central media file store (`comm_media_asset`) | **Merge** | `CommunicationAssetsAdmin` (tab) | — | **CDE** |
| Text Blocks | `/admin/organization/text-blocks` | None (orphan route) | `src/pages/admin/organization/TextBlocksPage.tsx` | Reusable `core_text_block` entries with token support | **Keep** | — | — | **CDE** |
| Core Templates | `/admin/core-templates` | None (orphan) | `src/pages/admin/CoreTemplateAdmin.tsx` | CRUD `core_template` records (body_html, body_text, channels) | **Keep** | — | Overlaps `NotificationTemplates`, `NotificationTemplateManager`, org `NotificationTemplatesPage` | **CDE** |
| Notification Templates (org) | `/admin/organization/notification-templates` | None (orphan route) | `src/pages/admin/organization/NotificationTemplatesPage.tsx` | Org-scoped notification template overrides | **Merge** | `CoreTemplateAdmin` (tab) | `CoreTemplateAdmin.tsx` | **CDE** |
| Notification Templates (admin) | `/admin/notifications/templates` | System Admin → Notifications | `src/pages/admin/NotificationTemplates.tsx` | Legacy `notification_templates` table CRUD | **Merge** | `CoreTemplateAdmin` | `CoreTemplateAdmin.tsx` | **CDE** |
| Notification Templates (manager) | `/admin/notifications/notification-templates` | System Admin → Notifications | `src/pages/admin/notifications/NotificationTemplateManager.tsx` | Tabbed template manager (Email/SMS/Push/In-App) | **Merge** | `CoreTemplateAdmin` | `NotificationTemplates.tsx` | **CDE** |
| Document Configuration | `/admin/document-configuration` | None (orphan) | `src/pages/admin/DocumentConfigurationPage.tsx` | Per-module document category/type bindings | **Keep** | — | — | **CDE** |
| DMS Admin | `/admin/dms` | None (orphan) | `src/pages/admin/CoreDmsAdmin.tsx` | Document Management System config & file-type rules | **Keep** | — | — | **CDE** |
| DMS API Test | `/admin/dms-api-test` | None (orphan) | `src/pages/admin/DmsApiTest.tsx` | Dev/QA: test DMS API endpoints live | **Move** → QA/dev tools | — | — | **SYS** |
| IP Card Configuration | `/admin/ip-card-configuration` | None (orphan) | `src/pages/admin/IPCardConfiguration.tsx` | Layout/template for insured-person ID cards | **Keep** | — | — | **CDE** |

---

### 2D — Notification & Messaging

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| Notification Management | `/admin/notifications` | System Administration, userMenuItems | `src/pages/admin/NotificationManagement.tsx` | Hub/tabs: templates, logs, campaigns | **Merge** | `NotificationTemplateManager` | Overlaps 4 other notification pages | **CDE** |
| Notification Log | `/admin/notifications/log` | System Admin → Notifications | `src/pages/admin/NotificationLogs.tsx` | View sent notification log | **Keep** | — | — | **CDE** |
| Channel Settings | `/admin/notifications/channels` | System Admin → Notifications | `src/pages/admin/notifications/ProviderSettings.tsx` | Configure Email/SMS/Push delivery providers | **Keep** | — | — | **CDE** |
| Notification Provider Settings | `/admin/notifications/providers` | userMenuItems | `src/pages/admin/notifications/ProviderSettings.tsx` *(same page)* | Duplicate route to same provider settings page | **Delete** (alias) | `/admin/notifications/channels` | `ProviderSettings.tsx` | **CDE** |
| User Notification Preferences | `/admin/user-notification-preferences` | None (orphan) | `src/pages/admin/UserNotificationPreferences.tsx` | System-wide default notification preference config | **Move** → User profile section | — | — | **CDE** |
| Email Campaigns | `/admin/email-campaigns` | System Admin → Notifications | `src/pages/admin/EmailCampaigns.tsx` | Create and send bulk email campaigns | **Keep** | — | — | **CDE** |
| Email Delivery Logs | `/admin/email-logs` | System Admin → Notifications | `src/pages/admin/EmailLogs.tsx` | SMTP delivery log viewer | **Merge** | `NotificationLogs` (tab) | `NotificationLogs.tsx` | **CDE** |

---

### 2E — Workflow & Automation

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| Workflow Management | `/admin/workflows` | System Admin → Workflow Engine | `src/pages/admin/workflows/WorkflowList.tsx` | List all workflow definitions | **Keep** | — | — | **WFA** |
| Create/Edit Workflow | `/admin/workflows/new`, `/admin/workflows/:id` | System Admin → Workflow Engine | `src/pages/admin/workflows/WorkflowForm.tsx` | CRUD form for workflow definition | **Keep** | — | — | **WFA** |
| Workflow Instances | `/admin/workflow-instances` | System Admin → Workflow Engine | `src/pages/admin/workflows/WorkflowInstanceList.tsx` | Live runtime instances list | **Keep** | — | — | **WFA** |
| Workflow Instance Detail | `/admin/workflow-instances/:id` | System Admin → Workflow Engine | `src/pages/admin/workflows/WorkflowInstanceDetail.tsx` | Single instance state/step viewer | **Keep** | — | — | **WFA** |
| Workflow Triggers | `/admin/workflow-triggers` | System Admin → Workflow Engine | `src/pages/admin/workflows/WorkflowTriggers.tsx` | Event → workflow trigger mappings | **Keep** | — | — | **WFA** |
| Workflow Logs | `/admin/workflow-logs` | System Admin → Workflow Engine | `src/pages/admin/workflows/WorkflowLogs.tsx` | Execution log / audit trail for workflows | **Merge** | `/system-logs/workflows` menu entry | — | **WFA** |
| Workflow Analytics | `/admin/workflow-analytics` | System Admin → Workflow Engine | `src/pages/admin/workflows/WorkflowAnalytics.tsx` | Throughput / SLA dashboard for workflows | **Keep** | — | — | **WFA** |
| Workflow Security Settings | `/admin/workflow-security` | System Admin → Workflow Engine | `src/pages/admin/workflows/WorkflowSecuritySettings.tsx` | Signing, token expiry, secure-step settings | **Keep** | — | — | **WFA** |
| Secured Workflow Approvals | `/admin/workflow-secured-approvals` | System Admin → Workflow Engine | `src/pages/admin/workflows/SecuredWorkflowApprovals.tsx` | Review pending secure-step approvals | **Keep** | — | — | **WFA** |
| Workflow Role Assignment | `/admin/workflow-role-assignment` | System Admin → Workflow Engine | `src/pages/admin/workflows/WorkflowRoleAssignment.tsx` | Assign roles to workflow steps | **Keep** | — | — | **WFA** |
| Central Scheduler | `/admin/scheduler` | System Administration | `src/pages/admin/CentralScheduler.tsx` | Cron-style job scheduling & monitoring | **Keep** | — | — | **WFA** |
| Numbering Rules | `/admin/numbering-rules` | System Administration | `src/pages/admin/NumberingRulesAdmin.tsx` | Reference sequence / auto-number format rules | **Keep** | — | — | **WFA** |
| Reference Sequences | `/admin/reference-sequences` | System Administration | `src/pages/systemAdmin/ReferenceSequencesAdmin` *(external)* | DB-backed sequence configuration | **Merge** | `NumberingRulesAdmin` | `NumberingRulesAdmin.tsx` | **WFA** |
| Payment Allocation Rules | `/admin/ledger/allocation-rules` | None (orphan) | `src/pages/admin/PaymentAllocationRules.tsx` | Define ledger allocation rules for payments | **Keep** | — | — | **WFA** |

---

### 2F — Master Data

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| Activity Types | `/admin/master-data/activity-types` | Master Data | `src/pages/admin/master-data/ActivityManagement.tsx` | Lookup: audit/task activity types | **Keep** | — | — | **MD** |
| Bank Codes | `/admin/master-data/bank-codes` | Master Data | `src/pages/admin/master-data/BankCodeManagement.tsx` | Lookup: banking institution codes | **Keep** | — | — | **MD** |
| Batch Status | `/admin/master-data/batch-status` | Master Data | `src/pages/admin/master-data/BatchStatusManagement.tsx` | Lookup: C3 batch status codes | **Keep** | — | — | **MD** |
| C3 Status | `/admin/master-data/c3-status` | Master Data | `src/pages/admin/master-data/C3StatusManagement.tsx` | Lookup: C3 filing status values | **Keep** | — | — | **MD** |
| Countries | `/admin/master-data/countries` | Master Data | `src/pages/admin/master-data/CountryManagement.tsx` | Lookup: ISO country list | **Keep** | — | — | **MD** |
| Dependent Relations | `/admin/master-data/dependent-relations` | Master Data | `src/pages/admin/master-data/DependentRelationManagement.tsx` | Lookup: IP → dependent relationship types | **Merge** | `RelationManagement` | `RelationManagement.tsx` | **MD** |
| Relations | `/admin/master-data/relations` | Master Data | `src/pages/admin/master-data/RelationManagement.tsx` | Lookup: generic relationship types | **Merge** | `DependentRelationManagement` | `DependentRelationManagement.tsx` | **MD** |
| Districts | `/admin/master-data/districts` | Master Data | `src/pages/admin/master-data/DistrictManagement.tsx` | Lookup: administrative district list | **Keep** | — | — | **MD** |
| Postal Districts | `/admin/master-data/postal-districts` | Master Data | `src/pages/admin/master-data/PostalDistrictManagement.tsx` | Lookup: postal code zones | **Merge** | `DistrictManagement` (tab) | — | **MD** |
| Villages | `/admin/master-data/villages` | Master Data | `src/pages/admin/master-data/VillagesManagement.tsx` | Lookup: village codes (links to districts) | **Keep** | — | — | **MD** |
| Eye Colors | `/admin/master-data/eye-colors` | Master Data | `src/pages/admin/master-data/EyeColorManagement.tsx` | Lookup: biometric eye-color codes | **Keep** | — | — | **MD** |
| Industries | `/admin/master-data/industries` | Master Data | `src/pages/admin/master-data/IndustryManagement.tsx` | Lookup: employer industry classifications | **Keep** | — | — | **MD** |
| Inspectors | `/admin/master-data/inspectors` | Master Data | `src/pages/admin/master-data/InspectorManagement.tsx` | Lookup/roster of compliance inspectors | **Keep** | — | — | **MD** |
| Invoice Status | `/admin/master-data/invoice-status` | Master Data | `src/pages/admin/master-data/InvoiceStatusManagement.tsx` | Lookup: invoice lifecycle statuses | **Keep** | — | — | **MD** |
| Invoice Types | `/admin/master-data/invoice-types` | Master Data | `src/pages/admin/master-data/InvoiceTypesManagement.tsx` | Lookup: invoice category types | **Keep** | — | — | **MD** |
| Legal Status | `/admin/master-data/legal-status` | Master Data | `src/pages/admin/master-data/LegalStatusManagement.tsx` | Lookup: employer legal standing codes | **Keep** | — | — | **MD** |
| Marital Status | `/admin/master-data/marital-status` | Master Data | `src/pages/admin/master-data/MaritalStatusManagement.tsx` | Lookup: IP marital status values | **Keep** | — | — | **MD** |
| Merchants | `/admin/master-data/merchants` | Master Data | `src/pages/admin/master-data/MerchantManagement.tsx` | Lookup: payment merchant records | **Keep** | — | — | **MD** |
| Methods of Payment | `/admin/master-data/methods-of-payment` | Master Data | `src/pages/admin/master-data/MethodOfPaymentManagement.tsx` | Lookup: payment method types | **Merge** | `PaymentTypeManagement` | `PaymentTypeManagement.tsx` | **MD** |
| Payment Types | `/admin/master-data/payment-types` | Master Data | `src/pages/admin/master-data/PaymentTypeManagement.tsx` | Lookup: payment type classifications | **Merge** | `MethodOfPaymentManagement` | `MethodOfPaymentManagement.tsx` | **MD** |
| Occupations | `/admin/master-data/occupations` | Master Data | `src/pages/admin/master-data/OccupationManagement.tsx` | Lookup: SOC-style occupation codes | **Keep** | — | — | **MD** |
| Pay Periods | `/admin/master-data/pay-periods` | Master Data | `src/pages/admin/master-data/PayPeriodManagement.tsx` | Lookup: payroll period types (weekly, monthly, etc.) | **Keep** | — | — | **MD** |
| Payer Types | `/admin/master-data/payer-types` | Master Data | `src/pages/admin/master-data/PayerTypeManagement.tsx` | Lookup: who pays (employer, self, govt) | **Keep** | — | — | **MD** |
| Payment Sources | `/admin/master-data/payment-sources` | Master Data | `src/pages/admin/master-data/PaymentSourcesManagement.tsx` | Lookup: origin of payment (bank, cash, online) | **Keep** | — | — | **MD** |
| Penalty Rates | `/admin/master-data/penalty-rates` | Master Data | `src/pages/admin/master-data/PenaltyManagement.tsx` | Lookup: penalty rate schedules | **Keep** | — | — | **MD** |
| Receipt Status | `/admin/master-data/receipt-status` | Master Data | `src/pages/admin/master-data/ReceiptStatusManagement.tsx` | Lookup: receipt lifecycle states | **Keep** | — | — | **MD** |
| Sectors | `/admin/master-data/sectors` | Master Data | `src/pages/admin/master-data/SectorManagement.tsx` | Lookup: employer economic sectors | **Keep** | — | — | **MD** |
| SSC Rates | `/admin/master-data/ssc-rates` | Master Data | `src/pages/admin/master-data/SscRatesManagement.tsx` | SSC contribution rate tables | **Keep** | — | — | **MD** |
| VC Contrib Rates | `/admin/master-data/vc-contrib-rates` | Master Data | `src/pages/admin/master-data/VcContribRateManagement.tsx` | Voluntary contributor rate schedule | **Keep** | — | — | **MD** |
| VC Eligibility Config | `/admin/master-data/vc-eligibility-config` | Master Data | `src/pages/admin/master-data/VcEligibilityConfigManagement.tsx` | Age/period rules for VC eligibility | **Keep** | — | — | **MD** |
| Verification Types | `/admin/master-data/verification-types` | Master Data | `src/pages/admin/master-data/VerifyManagement.tsx` | Lookup: ID verification method types | **Keep** | — | — | **MD** |
| Designations (master data) | `/admin/master-data/designations` | Master Data | `src/pages/admin/master-data/DesignationMasterManagement.tsx` | Third designation surface (lookup table only) | **Merge** | `DesignationManagement` | `DesignationManagement.tsx` | **ORG** |
| Income Categories | `/admin/master-data/income-categories` | Master Data (menuItems), None in systemAdmin | `src/pages/admin/IncomeCategoryManagement.tsx` | Lookup: income bracket/category types | **Keep** | — | — | **MD** |
| Income Codes | `/admin/master-data/income-codes` | None (orphan route) | `src/pages/admin/IncomeCodeManagement.tsx` | Lookup: income code definitions | **Merge** | `IncomeCategoryManagement` (tab) | — | **MD** |
| SEP Contrib Rates | `/admin/master-data/sep-contrib-rates` *(→ redirect)* | None | `src/pages/admin/SepContribRateManagement.tsx` | Self-employed person contribution rate schedule | **Move** → C3 config tab | `C3ConfigurationPage` | — | **MD** |

---

### 2G — C3 / Contribution Configuration

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| C3 Configuration | `/admin/c3-configuration` | System Administration | `src/pages/admin/C3ConfigurationPage.tsx` | Master C3 settings hub (tabs: seasons, rules, SEP) | **Keep** | — | — | **MD** |
| C3 Calculation Config | `/admin/c3-calculation-config` | None (orphan) | `src/pages/admin/C3CalculationConfigPage.tsx` | Formula/threshold config for C3 calculations | **Merge** | `C3ConfigurationPage` (tab) | — | **MD** |
| C3 Period Config | `/admin/c3-period-config` | None (orphan) | `src/pages/admin/C3PeriodConfigPage.tsx` | Manage filing periods / cloning | **Merge** | `C3ConfigurationPage` (tab) | — | **MD** |
| Levy Slabs Config | *(no route in routes.ts — orphan page)* | None | `src/pages/admin/LevySlabsConfigPage.tsx` | Configure levy slab thresholds | **Move** → C3 config tab | `C3ConfigurationPage` | — | **MD** |
| Fee Configuration | `/admin/fee-configuration` | None (orphan) | `src/pages/admin/FeeConfiguration.tsx` | Define admin fee schedules | **Keep** | — | — | **MD** |

---

### 2H — Integrations & API

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| API Keys | `/admin/api-keys` | System Administration | `src/pages/admin/ApiKeysManagement.tsx` | Generate/revoke API access keys | **Keep** | — | — | **INT** |
| Public API Management | `/admin/public-api` | System Administration | `src/pages/admin/PublicApiManagement.tsx` | Manage public-facing API endpoints, rate limits, docs | **Keep** | — | — | **INT** |
| External API Management | `/admin/external-apis` | System Admin → External API | `src/pages/admin/ExternalApiManagement.tsx` | Outbound third-party API config & execution logs | **Keep** | — | — | **INT** |
| API Configuration | `/admin/api-configuration` | System Administration | `src/pages/admin/settings/ApiConfiguration.tsx` | Key-value API settings store | **Merge** | `ApiKeysManagement` (tab) | — | **INT** |
| External Portal Settings | `/admin/external-portal-settings` | None (orphan) | `src/pages/admin/ExternalPortalSettings.tsx` | Feature-flag toggles for employer/doctor portal | **Keep** | — | — | **INT** |
| External Portal Approvals | `/admin/external-portal-approvals` | None (orphan) | `src/pages/admin/ExternalPortalApprovals.tsx` | Approve pending external-portal user registrations | **Keep** | — | — | **INT** |
| Public Catalog Validation | `/admin/public-catalog-validation` | None (orphan) | `src/pages/admin/PublicCatalogValidation.tsx` | Validate public API catalog consistency | **Keep** | — | — | **INT** |
| API Test Console | `/admin/api-test-console` | System Admin → External API | `src/pages/admin/api-test-console/ApiTestDashboard.tsx` | Multi-tab API test harness (dashboard shell) | **Keep** | — | — | **INT** |
| API Keys Console | `/admin/api-test-console/keys` | API Test Console | `src/pages/admin/api-test-console/ApiKeysConsole.tsx` | Key management within test console | **Keep** | — | — | **INT** |
| Environments Console | `/admin/api-test-console/environments` | API Test Console | `src/pages/admin/api-test-console/EnvironmentsConsole.tsx` | Manage test environments/variables | **Keep** | — | — | **INT** |
| Auth Test Lab | `/admin/api-test-console/auth-lab` | API Test Console | `src/pages/admin/api-test-console/AuthTestLab.tsx` | Test auth flows (JWT, OAuth, API key) | **Keep** | — | — | **INT** |
| Endpoint Explorer | `/admin/api-test-console/endpoints` | API Test Console | `src/pages/admin/api-test-console/EndpointExplorer.tsx` | Browse/search registered endpoints | **Keep** | — | — | **INT** |
| Compliance Runner | `/admin/api-test-console/runner` | API Test Console | `src/pages/admin/api-test-console/ComplianceRunner.tsx` | Run compliance-check test suites | **Keep** | — | — | **INT** |
| Saved Cases Console | `/admin/api-test-console/saved-cases` | API Test Console | `src/pages/admin/api-test-console/SavedCasesConsole.tsx` | Manage saved test cases | **Keep** | — | — | **INT** |
| Suites Console | `/admin/api-test-console/suites` | API Test Console | `src/pages/admin/api-test-console/SuitesConsole.tsx` | Group test cases into suites | **Keep** | — | — | **INT** |
| Execution Logs | `/admin/api-test-console/logs` | API Test Console | `src/pages/admin/api-test-console/ExecutionLogs.tsx` | View API test run history | **Keep** | — | — | **INT** |

---

### 2I — System Administration & Tooling

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| Global Settings | `/admin/global-settings` | System Administration | `src/pages/systemAdmin/GlobalSettings` *(external)* | System-wide key-value config store | **Keep** | — | — | **SYS** |
| System Settings (legacy) | `/admin/settings` | AppRoutes direct | `src/pages/systemAdmin/SystemSettings` *(external)* | Old settings shell — superceded by Global Settings | **Delete** / redirect | `GlobalSettings` | `GlobalSettings` | **SYS** |
| Audit Log | `/admin/audit-log` | System Administration (menu) | *(no matching page file — orphan menu entry)* | View change audit trail | **Keep** (implement) | — | — | **SYS** |
| Backup & Recovery | `/admin/backup` | AppRoutes direct | `src/pages/systemAdmin/BackupRecovery` *(external)* | DB backup / restore management | **Keep** | — | — | **SYS** |
| System Logs | `/admin/logs` | AppRoutes direct | `src/pages/systemAdmin/SystemLogs` *(external)* | Legacy system log viewer | **Merge** → system-logs sub-tree | — | `/system-logs/*` menu entries | **SYS** |
| Session Health | `/admin/session-health` | AppRoutes direct | `src/pages/systemAdmin/SessionHealth` *(external)* | Active session / token health dashboard | **Keep** | — | — | **SYS** |
| System Cleanup Dashboard | `/admin/system-cleanup` | System Admin → System Cleanup | `src/pages/admin/system-cleanup/SystemCleanupDashboard.tsx` | Overview of stale-code cleanup pipeline | **Keep** | — | — | **SYS** |
| Active Modules Inventory | `/admin/system-cleanup/modules-inventory` | System Admin → System Cleanup | `src/pages/admin/system-cleanup/ActiveModulesInventory.tsx` | Enumerate live modules and their status | **Keep** | — | — | **SYS** |
| Dependency Scan | `/admin/system-cleanup/dependency-scan` | System Admin → System Cleanup | `src/pages/admin/system-cleanup/DependencyScan.tsx` | Detect unused/orphaned component dependencies | **Keep** | — | — | **SYS** |
| Cleanup Review | `/admin/system-cleanup/cleanup-review` | System Admin → System Cleanup | `src/pages/admin/system-cleanup/CleanupReview.tsx` | Review & approve suggested deletions | **Keep** | — | — | **SYS** |
| Rollback & Recovery | `/admin/system-cleanup/rollback` | System Admin → System Cleanup | `src/pages/admin/system-cleanup/RollbackScreen.tsx` | Roll back a cleanup batch | **Keep** | — | — | **SYS** |
| Data Migration | `/admin/data-migration` | None (orphan) | `src/pages/admin/DataMigration.tsx` | Bulk table-to-table data migration tool | **Keep** | — | — | **SYS** |
| Release Management | `/admin/release-management` | None (orphan) | `src/pages/admin/ReleaseManagement.tsx` | Changelog, version tags, release notes | **Keep** | — | — | **SYS** |
| Date Culture Consistency | `/admin/date-culture-consistency` | None (orphan) | `src/pages/admin/DateCultureConsistency.tsx` | Detect locale/date-format inconsistencies in DB | **Keep** | — | — | **SYS** |
| Knowledge Base Admin | `/admin/knowledge-base` | None (orphan) | `src/pages/admin/settings/KnowledgeBaseAdmin.tsx` | Manage help articles, FAQs, form hints | **Keep** | — | — | **SYS** |
| QA Dashboard | `/admin/qa` | System Admin → Quality Assurance | `src/pages/admin/qa/QADashboard.tsx` | QA metrics overview | **Keep** | — | — | **SYS** |
| Knowledge Repository | `/admin/qa/knowledge` | System Admin → Quality Assurance | `src/pages/admin/qa/KnowledgeRepository.tsx` | QA-specific knowledge base / test playbook | **Merge** | `KnowledgeBaseAdmin` | `settings/KnowledgeBaseAdmin.tsx` | **SYS** |
| QA Change Requests | `/admin/qa/change-requests` | None (orphan) | `src/pages/admin/qa/QAChangeRequests.tsx` | Track QA-driven change requests | **Keep** | — | — | **SYS** |
| DMS API Test | `/admin/dms-api-test` | None (orphan) | `src/pages/admin/DmsApiTest.tsx` | Dev: live DMS API test runner | **Move** → `/admin/api-test-console` | — | — | **SYS** |

---

### 2J — BeMA Admin (sub-tree under `/bema/admin/**`)

> All four `/bema/admin/*` routes are **Navigate redirects** in `AppRoutes.tsx` pointing to `/compliance/admin/**`. The canonical pages live in `src/pages/compliance/admin/`.

| Menu Name | Route | Current Parent | Page File | Purpose | Keep / Move / Merge / Delete | Merge With | Duplicate Of | Recommended New Group |
|---|---|---|---|---|---|---|---|---|
| BeMA Admin & Config | `/bema/admin/rules` → `/compliance/admin/settings/rule-engine` | BeMA Compliance → Admin & Config | *(redirect)* | Rule engine for compliance calculations | **Keep** (redirect OK) | — | — | **WFA** |
| BeMA Templates | `/bema/admin/templates` → `/compliance/admin/settings/templates` | BeMA Compliance (collapsed) | *(redirect)* | Compliance document templates | **Keep** (redirect OK) | — | — | **CDE** |
| BeMA Roles | `/bema/admin/roles` → `/compliance/admin/staff/officers` | BeMA Compliance (collapsed) | *(redirect)* | Compliance officer/role management | **Keep** (redirect OK) | — | — | **IDS** |
| BeMA Logs | `/bema/admin/logs` → `/compliance/admin/automation/history` | BeMA Compliance (collapsed) | *(redirect)* | Compliance automation job history | **Keep** (redirect OK) | — | — | **SYS** |

---

## 3. Duplication Matrix

### 3.1 Designation Management (3 surfaces, 1 entity)

| Surface | Route | File |
|---|---|---|
| A | `/admin/designations` | `src/pages/admin/DesignationManagement.tsx` |
| B | `/admin/designation-hierarchy` | `src/pages/admin/DesignationHierarchy.tsx` |
| C | `/admin/master-data/designations` | `src/pages/admin/master-data/DesignationMasterManagement.tsx` |

**Verdict:** All three manage the same `designations` table. Consolidate into one page with two tabs: **"CRUD List"** (A+C) and **"Hierarchy View"** (B). Delete C.

---

### 3.2 Notification Templates (5 surfaces, 2 tables)

| Surface | Route | File | Table |
|---|---|---|---|
| A | `/admin/notifications/templates` | `src/pages/admin/NotificationTemplates.tsx` | `notification_templates` |
| B | `/admin/notifications/notification-templates` | `src/pages/admin/notifications/NotificationTemplateManager.tsx` | `notification_templates` |
| C | `/admin/core-templates` | `src/pages/admin/CoreTemplateAdmin.tsx` | `core_template` |
| D | `/admin/organization/notification-templates` | `src/pages/admin/organization/NotificationTemplatesPage.tsx` | `core_template` (org-scoped) |
| E | `/admin/notifications` (tab) | `src/pages/admin/NotificationManagement.tsx` | Both |

**Verdict:** The `enterprise/NotificationResolver.ts` mandates that modules read through `core_template`. A and B are legacy `notification_templates` readers. Merge A+B into C as a "Legacy Templates" tab. Remove D as a standalone route (fold into C as an org-scope filter). E becomes the hub entry point.

---

### 3.3 Department Communication Fields (4 surfaces)

| Surface | Route | File | Purpose |
|---|---|---|---|
| A | `/admin/departments` | `src/pages/admin/DepartmentManagement.tsx` | Core dept CRUD (includes comm field storage) |
| B | `/admin/organization/departments` | `src/pages/admin/organization/DepartmentProfilesPage.tsx` | Comm/doc profile overrides per dept |
| C | `/admin/organization/department-mapping` | `src/pages/admin/organization/DepartmentMappingPage.tsx` | Legacy dept → org-unit mapping |
| D | `/admin/organization/communication-assets` | `src/pages/admin/communication/CommunicationAssetsAdmin.tsx` | Comm assets scoped to dept |

**Verdict:** A owns the entity. B, C, D are satellite views. Consolidate B+C as tabs on A. D should be a filtered view in `CommunicationAssetsAdmin` itself.

---

### 3.4 Office / Location Management (3 surfaces)

| Surface | Route | File |
|---|---|---|
| A | `/admin/offices` | `src/pages/admin/OfficeManagement.tsx` |
| B | `/admin/organization/locations` | `src/pages/admin/organization/LocationsPage.tsx` |
| C | `/admin/office-ip-management` | `src/pages/admin/OfficeIPManagement.tsx` |

**Verdict:** A and B are the same entity (`tb_offices` / locations table) with different UI skins. Merge into one page. C is a security concern — merge it as a tab inside `/admin/security/ip-access` (`IPAccessRulesManagement`), filtered by office.

---

### 3.5 IP Whitelist (2 surfaces)

| Surface | Route | File |
|---|---|---|
| A | `/admin/security/ip-access` | `src/pages/admin/security/IPAccessRulesManagement.tsx` |
| B | `/admin/office-ip-management` | `src/pages/admin/OfficeIPManagement.tsx` |

**Verdict:** Same concern (IP allow-listing). B is a scoped view. Merge B as a tab or filtered view within A.

---

### 3.6 Role Management (3 surfaces)

| Surface | Route | File |
|---|---|---|
| A | `/admin/roles` | `src/pages/admin/roles/RoleList.tsx` |
| B | `/admin/roles-permissions` | `src/pages/admin/RolePermissionManagement.tsx` |
| C | `/admin/role-hierarchy` | `src/pages/admin/RoleHierarchy.tsx` |

**Verdict:** All three concern the `app_roles` / `role_permissions` schema. Consolidate into one page with three tabs: List, Permissions Matrix, Hierarchy.

---

### 3.7 Communication Assets (3 surfaces)

| Surface | Route | File |
|---|---|---|
| A | `/admin/communication` | `src/pages/admin/communication/CommunicationAssetsAdmin.tsx` |
| B | `/admin/organization/communication-assets` | same component, different route |
| C | `/admin/organization/document-assets` | `src/pages/admin/organization/DocumentAssetsPage.tsx` |

**Verdict:** A and B are the same page at two URLs — delete B (alias). C is `comm_document_asset` vs `comm_media_asset` in A — merge as tabs in A.

---

### 3.8 C3 Configuration (3 surfaces)

| Surface | Route | File |
|---|---|---|
| A | `/admin/c3-configuration` | `src/pages/admin/C3ConfigurationPage.tsx` |
| B | `/admin/c3-calculation-config` | `src/pages/admin/C3CalculationConfigPage.tsx` |
| C | `/admin/c3-period-config` | `src/pages/admin/C3PeriodConfigPage.tsx` |

**Verdict:** All configure the same C3 domain. B and C are already tabs-pattern candidates. Merge B+C as tabs inside A. Also absorb `LevySlabsConfigPage` and `SepContribRateManagement` here.

---

### 3.9 Module Management (2 surfaces)

| Surface | Route | File |
|---|---|---|
| A | `/admin/modules` | `src/pages/admin/ModuleManagement.tsx` |
| B | `/admin/organization/modules` | `src/pages/admin/organization/ModuleRegistryPage.tsx` |

**Verdict:** A manages `app_modules` globally (sort order, icon, route). B is an org-scoped enable/disable view of the same table. Merge B as a "Per-Org Override" tab inside A.

---

### 3.10 Knowledge Base (2 surfaces)

| Surface | Route | File |
|---|---|---|
| A | `/admin/knowledge-base` | `src/pages/admin/settings/KnowledgeBaseAdmin.tsx` |
| B | `/admin/qa/knowledge` | `src/pages/admin/qa/KnowledgeRepository.tsx` |

**Verdict:** A is a help-content CMS; B is a QA test playbook. Related but distinct audiences. **Move** B to `/admin/qa/` and keep A in System Administration. Avoid merging.

---

### 3.11 Numbering / Reference Sequences (2 surfaces)

| Surface | Route | File |
|---|---|---|
| A | `/admin/numbering-rules` | `src/pages/admin/NumberingRulesAdmin.tsx` |
| B | `/admin/reference-sequences` | `src/pages/systemAdmin/ReferenceSequencesAdmin` |

**Verdict:** A defines format patterns; B manages DB sequences. Merge B as a "Sequences" tab inside A.

---

### 3.12 Notification Logs / Email Logs (2 surfaces)

| Surface | Route | File |
|---|---|---|
| A | `/admin/notifications/log` | `src/pages/admin/NotificationLogs.tsx` |
| B | `/admin/email-logs` | `src/pages/admin/EmailLogs.tsx` |

**Verdict:** Both show delivery audit trails. B is channel-specific. Merge B as an "Email" tab inside A with channel filter.

---

## 4. Orphans

### 4.1 Pages with No Menu Entry

These files are routed (`AppRoutes.tsx`) but do not appear in any sidebar `menuItems` file or `app_modules` DB query:

| Page File | Route | Notes |
|---|---|---|
| `src/pages/admin/data-access/DataScopeRules.tsx` | `/admin/data-access/scope-rules` | Entire data-access sub-tree missing from sidebar |
| `src/pages/admin/data-access/FieldSecurity.tsx` | `/admin/data-access/field-security` | Same |
| `src/pages/admin/data-access/RoleDataPolicies.tsx` | `/admin/data-access/role-policies` | Same |
| `src/pages/admin/data-access/UserDataOverrides.tsx` | `/admin/data-access/user-overrides` | Same |
| `src/pages/admin/data-access/PolicyTestConsole.tsx` | `/admin/data-access/test-console` | Same |
| `src/pages/admin/organization/OrganizationProfilePage.tsx` | `/admin/organization/profile` | Org sub-tree has no static menu entry |
| `src/pages/admin/organization/DepartmentProfilesPage.tsx` | `/admin/organization/departments` | Same |
| `src/pages/admin/organization/DepartmentMappingPage.tsx` | `/admin/organization/department-mapping` | Same |
| `src/pages/admin/organization/LocationsPage.tsx` | `/admin/organization/locations` | Same |
| `src/pages/admin/organization/DocumentAssetsPage.tsx` | `/admin/organization/document-assets` | Same |
| `src/pages/admin/organization/LetterheadsPage.tsx` | `/admin/organization/letterheads` | Same |
| `src/pages/admin/organization/MediaLibraryPage.tsx` | `/admin/organization/media-library` | Same |
| `src/pages/admin/organization/NotificationTemplatesPage.tsx` | `/admin/organization/notification-templates` | Same |
| `src/pages/admin/organization/PortalBrandingPage.tsx` | `/admin/organization/portal-branding` | Same |
| `src/pages/admin/organization/TextBlocksPage.tsx` | `/admin/organization/text-blocks` | Same |
| `src/pages/admin/organization/ModuleRegistryPage.tsx` | `/admin/organization/modules` | Same |
| `src/pages/admin/organization/EnterpriseHealthPage.tsx` | `/admin/organization/enterprise-health` | Same |
| `src/pages/admin/organization/UsageValidationPage.tsx` | `/admin/organization/usage` | Same |
| `src/pages/admin/communication/CommunicationAssetsAdmin.tsx` | `/admin/communication` | No static menu item |
| `src/pages/admin/C3CalculationConfigPage.tsx` | `/admin/c3-calculation-config` | No menu item |
| `src/pages/admin/C3PeriodConfigPage.tsx` | `/admin/c3-period-config` | No menu item |
| `src/pages/admin/LevySlabsConfigPage.tsx` | *(no route registered)* | Neither routed nor in menu |
| `src/pages/admin/SepContribRateManagement.tsx` | redirected → `/admin/c3-configuration` | Menu item gone, redirect exists |
| `src/pages/admin/SeedTestUsers.tsx` | `/admin/seed-test-users` | Dev-only, no menu |
| `src/pages/admin/DateCultureConsistency.tsx` | `/admin/date-culture-consistency` | No menu item |
| `src/pages/admin/DataMigration.tsx` | `/admin/data-migration` | No menu item |
| `src/pages/admin/ReleaseManagement.tsx` | `/admin/release-management` | No menu item |
| `src/pages/admin/PaymentAllocationRules.tsx` | `/admin/ledger/allocation-rules` | No menu item |
| `src/pages/admin/ExternalPortalApprovals.tsx` | `/admin/external-portal-approvals` | No menu item |
| `src/pages/admin/ExternalPortalSettings.tsx` | `/admin/external-portal-settings` | No menu item (listed only in routes.ts constant) |
| `src/pages/admin/PublicCatalogValidation.tsx` | `/admin/public-catalog-validation` | No menu item |
| `src/pages/admin/ModuleButtonBindings.tsx` | `/admin/module-button-bindings` | No menu item |
| `src/pages/admin/DmsApiTest.tsx` | `/admin/dms-api-test` | No menu item |
| `src/pages/admin/CoreDmsAdmin.tsx` | `/admin/dms` | No menu item |
| `src/pages/admin/CoreTemplateAdmin.tsx` | `/admin/core-templates` | No menu item |
| `src/pages/admin/IPCardConfiguration.tsx` | `/admin/ip-card-configuration` | No menu item |
| `src/pages/admin/FeeConfiguration.tsx` | `/admin/fee-configuration` | No menu item |
| `src/pages/admin/settings/KnowledgeBaseAdmin.tsx` | `/admin/knowledge-base` | No menu item (QA Knowledge repo exists separately) |
| `src/pages/admin/qa/QAChangeRequests.tsx` | `/admin/qa/change-requests` | Not in QA sub-menu |
| `src/pages/admin/UserNotificationPreferences.tsx` | `/admin/user-notification-preferences` | No menu item |
| `src/pages/admin/DesignationHierarchy.tsx` | `/admin/designation-hierarchy` | No menu item |
| `src/pages/admin/RoleHierarchy.tsx` | `/admin/role-hierarchy` | No menu item |
| `src/pages/admin/OfficeIPManagement.tsx` | `/admin/office-ip-management` | No menu item |

---

### 4.2 Menu Entries with No Matching Page File in `src/pages/admin`

These appear in `systemAdminMenuItems.ts` or `userMenuItems.ts` but either point to `src/pages/systemAdmin/` (external to audit scope) or have no page file at all:

| Menu Entry | Route | Status |
|---|---|---|
| Audit Log | `/admin/audit-log` | **No page file** — orphan menu entry |
| API Configuration (menu) | `/admin/api-configuration` | Points to `src/pages/admin/settings/ApiConfiguration.tsx` ✓ |
| Global Settings | `/admin/global-settings` | Points to `src/pages/systemAdmin/GlobalSettings` (out-of-scope) |
| System Settings | `/admin/settings` | Points to `src/pages/systemAdmin/SystemSettings` (out-of-scope) |
| Backup & Recovery | `/admin/backup` | Points to `src/pages/systemAdmin/BackupRecovery` (out-of-scope) |
| Session Health | `/admin/session-health` | Points to `src/pages/systemAdmin/SessionHealth` (out-of-scope) |
| System Monitoring sub-items (`/system-logs/*`) | Multiple | All point to `src/pages/systemAdmin/` or placeholder routes — **no pages in `src/pages/admin/`** |
| Audit Logs (userMenuItems) | `/admin/audit-logs` | No page file (differs from `/admin/audit-log`) — **two broken audit-log routes** |
| Notification Preferences (userMenuItems) | `/admin/notifications/providers` | Mapped to `ProviderSettings.tsx` ✓ but also aliases `/admin/notifications/channels` |

---

## 5. `app_modules` DB Column Shape

From `src/hooks/useNavigationMenu.ts` (line-confirmed):

```ts
interface AppModule {
  id: string;           // UUID PK
  name: string;         // snake_case permission key e.g. "system_administration"
  display_name: string; // Human label shown in sidebar
  description: string | null;
  icon: string | null;  // Lucide icon component name (string), resolved via getIcon()
  route: string | null; // Leaf URL; null for parent-group nodes
  parent_id: string | null; // Self-referential FK for unlimited nesting
  sort_order: number;
  is_enabled: boolean;  // Filtered: .eq('is_enabled', true)
  show_in_menu: boolean;// Filtered: .eq('show_in_menu', true)
}
```

Navigation tree is built recursively: roots (`parent_id IS NULL`) → children sorted by `sort_order`. Non-admin users are filtered by `user_permissions` (`action_name = 'view' AND is_granted = true`; `module_name` matches `AppModule.name`).

---

## 6. Enterprise Resolver Alignment Notes

The `src/lib/enterprise/` resolvers establish a canonical data flow that several admin pages currently bypass:

| Resolver | Canonical Path | Admin Pages That Bypass It |
|---|---|---|
| `CommunicationResolver.resolveCommunication()` | `comm_*` → `core_template` → `comm_media_asset` | `NotificationTemplates.tsx`, `NotificationTemplateManager.tsx` (read `notification_templates` directly) |
| `NotificationResolver.resolveNotification()` | `notification_templates` via comm context | `EmailCampaigns.tsx`, `EmailLogs.tsx` (direct Supabase queries) |
| `DocumentGenerationResolver.generateDocument()` | `core_template` + token pipeline | `DocumentConfigurationPage.tsx` (owns doc-type bindings but does not call resolver) |
| `PortalBrandingResolver` | `core_organization` | `organization/PortalBrandingPage.tsx` (likely writes directly) |

**Recommendation:** Any admin page that writes to `comm_*`, `core_template`, `notification_templates`, or `comm_media_asset` should validate through the corresponding resolver rather than issuing raw Supabase mutations, to preserve audit traces and inheritance logic.

---

*End of audit. Total page files catalogued: **131** (42 flat admin pages + 13 API-test-console + 5 data-access + 16 master-data + 10 organization + 15 sub-pages in users/workflows/security/settings/qa/communication/notifications + 14 system-cleanup/roles/organization sub-pages). Total distinct routes audited: **~160** (including redirects).*
