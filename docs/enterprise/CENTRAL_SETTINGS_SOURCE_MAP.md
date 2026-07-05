# Central Settings Source Map

Status: v1.0 — repository-verified
Owner: Enterprise Architecture
Consumers: `/admin/configuration-centre`, BN Product Builder readiness, IA cleanup

This map lists **every settings area** that already exists in the codebase, where CRUD
actually happens today, which tables/services back it, and what action the
Configuration Centre should take. **No new tables. No duplicate screens.**

Legend for **Action**:

- **KEEP** — existing canonical CRUD screen is sufficient; Configuration Centre links to it.
- **LINK** — Configuration Centre must link to the canonical route only.
- **EXTEND** — canonical screen exists but is missing fields; extend in place (do NOT clone).
- **TAB** — add a tab inside an existing canonical screen; do not create a new page.
- **REDIRECT** — legacy duplicate route exists; keep canonical and redirect legacy.
- **CREATE** — no screen exists anywhere; only then propose new.
- **DEFER** — do not touch in this cycle.

Legend for **Migration**:

- **none** — table is canonical, stays as-is.
- **adapter** — legacy table read via service adapter; no schema change.
- **facade** — service facade wraps multiple legacy sources.
- **future migration** — data migration deferred to a separate epic.

---

## 1. Platform Layer

Owned by Platform Admin. Cross-tenant, cross-country.

| Setting              | Route                          | Component/Page                | CRUD | Tables                                            | Service / Hook                          | Owner    | Duplicates                          | Action  | Migration | BN uses |
| -------------------- | ------------------------------ | ----------------------------- | ---- | ------------------------------------------------- | --------------------------------------- | -------- | ----------------------------------- | ------- | --------- | ------- |
| Users                | `/admin/users`                 | `UserList/UserCreate/UserEdit`| yes  | `profiles`, `auth.users`, `user_roles`            | `useUsers`, `useSupabaseAuth`           | Platform | `/admin/user-management` (redirect) | KEEP    | none      | indirect|
| Roles                | `/admin/roles`                 | `RolesAdmin`                  | yes  | `roles`, `role_hierarchy`, `user_roles`           | `useRoles`                              | Platform | `/admin/roles-permissions` (tab)    | KEEP    | none      | indirect|
| Permissions          | `/admin/roles?tab=permissions` | `RolesAdmin` (tab)            | yes  | `role_permissions`, `module_actions`              | `useRolePermissions`                    | Platform | —                                   | KEEP    | none      | yes     |
| Workflow (defs+runs) | `/admin/workflow-management`   | `WorkflowManagement`          | yes  | `workflow_definitions`, `workflow_instances`      | `useWorkflowManagement`                 | Platform | `/admin/workflow` (redirect)        | KEEP    | none      | yes     |
| Notifications (mgmt) | `/admin/notifications`         | `NotificationManagement`      | yes  | `notification_templates`, `notification_queue`    | `useNotificationTemplates`              | Platform | `/admin/notification-management`    | KEEP    | none      | yes     |
| Notification templates | `/admin/notification-templates` | `NotificationTemplatesAdmin` | yes | `notification_templates`, `notification_template_versions` | `useNotificationTemplates`     | Platform | `/admin/notifications/templates`, `/admin/comm/templates/*`, `/admin/core-templates`, `/admin/org/library/templates` (all redirect here) | KEEP | none | yes |
| Notification providers | `/admin/notifications/providers` | `ProviderSettings`         | yes  | `notification_providers`                          | `useNotificationProviders`              | Platform | —                                   | KEEP    | none      | no      |
| Notification channels| `/admin/notifications/channels`| `NotificationChannelSettings` | yes  | `notification_types`                              | `useNotificationChannels`               | Platform | —                                   | KEEP    | none      | yes     |
| Numbering            | `/admin/numbering`             | `NumberingAdmin`              | yes  | `core_number_sequence`, `core_number_sequence_rule`, `core_number_sequence_audit` | `useNumberSequences` | Platform | `/admin/numbering-rules` (redirect) | KEEP    | none      | yes     |
| Audit / logs         | `/system-logs/audit`           | `SystemLogs`                  | read | `audit_logs`, `system_audit_trail`                | `useAuditLogs`                          | Platform | `/admin/audit`, `/admin/audit-log`, `/admin/audit-logs` (redirect) | KEEP | none | indirect|
| Global settings      | `/admin/global-settings`       | `GlobalSettings`              | yes  | `system_settings`                                 | `useSystemSettings`                     | Platform | `/admin/settings` (legacy `SystemSettings`) | KEEP  | none      | yes (default_country, default_timezone) |
| Security             | `/admin/security`              | `SecuritySettings`            | yes  | `password_policies`, `mfa_config`, `security_policy_config` | `useSecuritySettings`         | Platform | —                                   | KEEP    | none      | no      |
| Data-access policies | `/admin/data-access/*`         | `DataScopeRules` etc.         | yes  | `data_scope_rules`, `field_security_rules`        | `useDataScopeRules`                     | Platform | —                                   | KEEP    | none      | indirect|
| Feature flags        | (managed via `feature_flags`)  | —                             | no   | `feature_flags`                                   | `useFeatureFlags`                       | Platform | —                                   | DEFER   | none      | yes     |

---

## 2. Enterprise Core

Cross-module, per-implementation (KN). Shared registries.

| Setting                    | Route                              | Component/Page                    | CRUD | Tables                                                                             | Service / Hook                         | Owner       | Duplicates | Action | Migration | BN uses |
| -------------------------- | ---------------------------------- | --------------------------------- | ---- | ---------------------------------------------------------------------------------- | -------------------------------------- | ----------- | ---------- | ------ | --------- | ------- |
| Reference Framework        | `/admin/reference-framework`       | `ReferenceFramework`              | yes  | `core_reference_category`, `core_reference_group`, `core_reference_value`, `_i18n`, `_alias`, `_external_code` | `useReferenceFramework` | Enterprise  | —          | KEEP   | none      | yes     |
| Enterprise catalogue       | `/admin/platform/enterprise-catalogue` | `EnterpriseServiceCatalogue`  | yes  | `enterprise_capability_registry`                                                   | `useEnterpriseCapabilities`            | Enterprise  | —          | KEEP   | none      | yes     |
| Master data (36 lookups)   | `/admin/master-data/*`             | `*Management` pages               | yes  | Legacy per-domain tables (`bn_bank_master`, `cont_stat`, `ip_code`, …)             | Individual `*Service` files            | Enterprise  | many       | EXTEND | adapter (legacy tables preserved) | yes |
| Configuration assignments  | `/admin/configuration/template-assignments` | `TemplateAssignmentsPage`| yes  | `core_configuration_assignment`                                                    | `useConfigurationAssignments`          | Enterprise  | —          | KEEP   | none      | yes     |
| Approval matrices          | `/admin/approval-matrix/*`         | `ApprovalMatrix*`                 | yes  | `bn_approval_policy` (+ per-domain policies)                                       | `useApprovalMatrix`                    | Enterprise  | —          | KEEP   | none      | yes     |
| API configuration          | `/admin/api-configuration`         | `ApiConfiguration`                | yes  | `api_registry`, `api_settings`, `api_config_audit_logs`                            | `useApiConfig`                         | Enterprise  | —          | KEEP   | none      | no      |

---

## 3. Organisation

Per-organisation implementation of Enterprise Core.

| Setting                | Route                                | Component/Page                | CRUD | Tables                                                        | Service / Hook                     | Owner        | Duplicates                                        | Action | Migration | BN uses |
| ---------------------- | ------------------------------------ | ----------------------------- | ---- | ------------------------------------------------------------- | ---------------------------------- | ------------ | ------------------------------------------------- | ------ | --------- | ------- |
| Organisation profile   | `/admin/organization/profile`        | `OrganizationProfilePage`     | yes  | `core_organization`                                           | `useOrganizationProfile`           | Organisation | `/admin/org/foundation/profile` (shell)           | KEEP   | none      | yes     |
| Offices / locations    | `/admin/offices`                     | `OfficesAdmin`                | yes  | `core_office`, `office_locations`, `office_ip_addresses`      | `useOffices`                       | Organisation | `/admin/organization/locations` (redirect)        | KEEP   | none      | yes     |
| Departments            | `/admin/departments`                 | `DepartmentsAdmin`            | yes  | `core_department`, `core_department_profile`, `core_department_location` | `useDepartments`         | Organisation | `/admin/master-data/departments` legacy, `/admin/organization/departments` (redirect) | KEEP | none | yes |
| Designations           | `/admin/designations`                | `DesignationsAdmin`           | yes  | `designation_hierarchy`, `roles`                              | `useDesignations`                  | Organisation | `/admin/master-data/designations` (redirect)      | KEEP   | none      | no      |
| Employees / positions  | `/admin/employees`, `/admin/positions` | `EmployeeList`, `PositionList` | yes | `profiles`, `core_team`                                       | `useEmployees`                     | Organisation | —                                                 | KEEP   | none      | no      |
| Calendar & holidays    | `/admin/calendar-holidays`           | `CalendarHolidaysPage`        | yes  | `public_holidays`, `ia_holidays`                              | `useHolidays`                      | Organisation | —                                                 | KEEP   | none      | yes     |
| Branding — letterheads | `/admin/organization/letterheads`    | `OrgLetterheadsPage`          | yes  | `comm_letterhead`                                             | `useCommunicationAssets`           | Organisation | `/admin/communication/letterhead` (canonical)     | KEEP   | none      | indirect|
| Branding — signatures  | `/admin/communication/signature`     | `CommunicationAssetsAdmin`    | yes  | `comm_email_signature`                                        | `useCommunicationAssets`           | Organisation | —                                                 | KEEP   | none      | no      |
| Branding — disclaimers | `/admin/communication/disclaimer`    | `CommunicationAssetsAdmin`    | yes  | `comm_disclaimer`                                             | `useCommunicationAssets`           | Organisation | —                                                 | KEEP   | none      | no      |
| Media library          | `/admin/organization/media-library`  | `OrgMediaLibraryPage`         | yes  | `comm_media_asset`, `comm_media_asset_version`                | `useMediaAssets`                   | Organisation | `/admin/org/assets/media`                         | KEEP   | none      | no      |
| Portal branding        | `/admin/organization/portal-branding`| `OrgPortalBrandingPage`       | yes  | `app_themes`, `core_organization`                             | `useOrganizationBranding`          | Organisation | —                                                 | KEEP   | none      | no      |
| Text blocks            | `/admin/organization/text-blocks`    | `OrgTextBlocksPage`           | yes  | `core_text_block`                                             | `useTextBlocks`                    | Organisation | `/admin/org/library/text-blocks`                  | KEEP   | none      | indirect|
| Document assets        | `/admin/organization/document-assets`| `OrgDocumentAssetsPage`       | yes  | `core_document_profile`, `core_document_sequence`             | `useDocumentAssets`                | Organisation | —                                                 | KEEP   | none      | yes     |

---

## 4. Shared Domains

Canonical `ssp_*` / `core_*` libraries reused by every module. Confirmed by
Enterprise Configuration Architecture v1.0 and Epics 2.4A / 2.5 / 2.6A / 2.7.

| Setting              | Route                            | Component/Page               | CRUD | Tables                                                                                       | Service / Hook                        | Owner  | Duplicates | Action | Migration | BN uses |
| -------------------- | -------------------------------- | ---------------------------- | ---- | -------------------------------------------------------------------------------------------- | ------------------------------------- | ------ | ---------- | ------ | --------- | ------- |
| Geography            | `/admin/geography`               | `GeographyDomainPage`        | yes  | `ssp_geo_country`, `ssp_geo_area`, `ssp_admin_level`, `ssp_jurisdiction`, `ssp_geo_external_code` | `geographyDomainService`         | Shared | `/admin/master-data/countries`, `districts`, `villages`, `postal-districts` (legacy CRUD) | LINK | adapter (legacy screens preserved) | yes |
| Identity             | `/admin/identity`                | `IdentityDomainPage`         | yes  | `ssp_identity_type`, `ssp_party_identity`, `ssp_identity_match_key`, `ssp_identity_validation_pattern`, `ssp_country_identity_rule`, `ssp_external_identity_ref` | `identityDomainService` | Shared | — | LINK | none | yes |
| Financial reference  | `/admin/financial-reference`     | `FinancialReferenceDomainPage`| yes | `ssp_bank`, `ssp_bank_branch`, `ssp_currency_profile`, `ssp_exchange_rate`, `ssp_chart_of_account_ref`, `ssp_payment_channel`, `ssp_settlement_method`, `ssp_financial_external_code` | `financialReferenceService` | Shared | `/admin/master-data/bank-codes`, `methods-of-payment`, `payment-sources` (legacy CRUD) | LINK | adapter | yes |
| Legal reference      | `/admin/legal-reference`         | `LegalReferenceDomainPage`   | yes  | `ssp_legal_reference`, `ssp_legal_act`, `ssp_legal_section`, `ssp_legal_reference_type`, `ssp_regulation`, `ssp_court_reference`, `ssp_country_legal_applicability`, `ssp_legal_external_code`, `core_legal_reference`, `core_legal_reference_version`, `core_module_legal_reference` | `legalReferenceDomainService` | Shared | `/admin/master-data/legal-status` | LINK | facade | yes |
| Participant / party  | `/admin/participant`             | `ParticipantDomainPage`      | read | `ssp_party_type`, `ssp_participant_role`, `ssp_relationship_type`, `ssp_party_role_binding`, `ssp_member_type`, `ssp_life_status`, `ssp_nationality`, `ssp_occupation_category`, `ssp_disability_type`, `v_ssp_party_projection` (read-only projection over `ip_master`/`er_master`) | `partyProjectionService`, `participantDomainService` | Shared | `/admin/master-data/relations`, `dependent-relations`, `marital-status`, `occupations`, `sectors` (legacy CRUD) | LINK | facade (read-only over legacy) | yes |
| Communication        | `/admin/communication-domain`    | `CommunicationDomainPage`    | yes  | `ssp_communication_channel`, `ssp_correspondence_type`, `ssp_recipient_preference`, `ssp_correspondence_template_binding`, `ssp_correspondence_legal_ref`, `ssp_delivery_status_ref`, `ssp_external_provider_code` + reuse of `notification_templates` and `comm_*` | `communicationDomainService`      | Shared | Template designer stays at `/admin/notification-templates` (see Platform table) | LINK | none | yes |
| Documents            | `/admin/dms` + `/admin/document-configuration` | `CoreDmsAdmin`, `DocumentConfigurationPage` | yes | `core_dms_document_type`, `core_dms_provider`, `core_dms_storage_policy`, `core_dms_module_mapping`, `core_document_profile`, `bn_document_profile` (legacy) | `dmsService`, `documentConfigurationService` | Shared | Historical `/admin/documents` (removed) | LINK | adapter (legacy `bn_document_profile` read-only) | yes |

---

## 5. Business Module — Benefits (BN Product Builder)

Product-specific rules that consume Shared Domains + Enterprise Core.
**BN Product Builder remains ON HOLD** — this map only records what would be consumed.

| Setting               | Route                       | Component/Page          | CRUD | Tables                                       | Service / Hook              | Owner    | Action | Consumes                                                          |
| --------------------- | --------------------------- | ----------------------- | ---- | -------------------------------------------- | --------------------------- | -------- | ------ | ----------------------------------------------------------------- |
| Product Builder       | `/bn/config` (on hold)      | `BnProductBuilder`      | n/a  | `bn_product`, `bn_product_version`, `bn_product_channel_config`, `bn_product_parameter` | `bnProductService` | Benefits | DEFER  | Enterprise Core + Shared Domains + Organisation                    |
| Eligibility rules     | inside Product Builder      | `EligibilityRuleEditor` | n/a  | `bn_eligibility_rule`, `bn_eligibility_fact` | `bnEligibilityService`      | Benefits | DEFER  | Participant, Identity, Legal                                       |
| Formula library       | `/bn/formulas` (on hold)    | `BnFormulaLibrary`      | n/a  | `bn_formula_template`, `bn_formula_version`, `bn_formula_variable_registry` | `bnFormulaService` | Benefits | DEFER | Reference Framework, Legal                                     |
| Documents required    | Product Builder — Documents | tab                     | n/a  | `bn_doc_requirement`, `bn_document_profile`  | `bnDocRequirementService`   | Benefits | DEFER  | Documents shared domain                                            |
| Payment rules         | Product Builder — Payments  | tab                     | n/a  | `bn_country_payment_config`, `bn_payment_method` | `bnPaymentConfigService` | Benefits | DEFER  | Financial reference, Numbering                                     |
| Legal basis           | Product Builder — Legal     | tab                     | n/a  | `bn_product_version` (legal_ref cols)        | reads Legal facade          | Benefits | DEFER  | Legal reference domain                                             |

---

## 6. Non-duplication rules (applied by Configuration Centre)

1. Every "Configure" button links to a canonical route in one of the tables above — Configuration Centre never renders a CRUD form itself.
2. Where multiple legacy routes exist (`/admin/master-data/*`, `/admin/comm/templates/*`, `/admin/notifications/templates`), Configuration Centre links to the canonical one only. Legacy routes remain reachable via existing `<Navigate replace>` redirects and are not removed.
3. Shared-domain screens (`/admin/geography` etc.) are the authoritative CRUD; legacy `/admin/master-data/*` screens are preserved for continuity but flagged as adapter-backed.
4. No new tables are introduced by this map or by the Configuration Centre.
5. Legacy BEMA / IA / BN / `ip_*` / `er_*` / `cl_*` / `cn_*` schemas are read via services only; no structural change.

---

## 7. Where new screens are genuinely needed

None at this time. Every entry above resolves to KEEP / LINK / EXTEND / TAB / REDIRECT / DEFER.
A future `documents_domain` landing shell (Option B from the Document Domain
decision) is optional and not required for BN Product Builder readiness.
