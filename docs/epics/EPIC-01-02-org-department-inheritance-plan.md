# Epic 1 & 2 — Organisation Master + Department Inheritance Plan

Status: Started
Scope: Reuse existing architecture first. Do not rebuild organisation, department, template, branding, or notification masters unless a confirmed gap requires additive change.

## Goal

Make organisation-level settings the single source of truth, with department-level inheritance and controlled overrides.

Every module must consume the resolved context only. Modules must not directly read or duplicate organisation, department, branding, template, letterhead, footer, disclaimer, signature, or notification settings.

Target inheritance:

```text
Organization default
  -> Department override, only where inherit_*_from_org = false
  -> Module / document / template / event override, only via central assignment/resolver
  -> System fallback with validation warning
```

## Existing assets to reuse

| Area | Existing implementation | Decision |
|---|---|---|
| Organisation master | `core_organization` | Reuse. No new organisation table. |
| Department master | `core_department`, `core_department_profile` | Reuse. No module-specific department master. |
| Department-location mapping | `core_department_location` + `office_locations` | Reuse. `office_locations` remains physical location source. |
| Organisation/dept UI hooks | `src/hooks/comm/useOrgManagement.ts` | Reuse; harden inheritance save behaviour. |
| Effective preview | `src/lib/comm/departmentEffectiveResolver.ts` | Reuse; extend for stricter warning and trace. |
| Enterprise resolver | `src/lib/enterprise/enterpriseContextResolver.ts` | Reuse as the target single entry point for modules. |
| Communication resolver | `src/lib/enterprise/CommunicationResolver.ts` | Should delegate to Enterprise Context instead of redoing context lookup. |
| Notification resolver | `src/lib/enterprise/NotificationResolver.ts` | Reuse; must consume resolved enterprise context. |
| Runtime validation | `src/lib/enterprise/runtimeValidation.ts`, `healthChecks.ts` | Reuse; make selected findings blocking in later gate. |

## Section-wise analysis

### 1. Organisation profile

Current strengths:
- Organisation master exists and already stores defaults for letterhead, signature, disclaimer, footer, DMS folder, location, language, currency, timezone, country, logo/seal assets.
- Existing documentation confirms no duplicate organisation table is needed.

Gaps:
- Modules can still indirectly bypass organisation defaults by using older resolvers or direct table reads.
- Health checks currently verify basic organisation fields, but not all required default slots.

Required changes:
- Add organisation completeness checks for default letterhead, signature, disclaimer, footer, location, DMS folder, logo, seal, language, timezone, currency.
- Ensure all module communication flows call `resolveEnterpriseContext()` or a resolver that delegates to it.

Acceptance criteria:
- One active organisation profile exists.
- Every configured default either resolves to an active record or shows a blocking validation error.
- No module screen stores duplicate organisation name/address/logo/footer/disclaimer values.

### 2. Department profile inheritance

Current strengths:
- `core_department_profile` already has inheritance flags such as `inherit_letterhead_from_org`, `inherit_email_signature_from_org`, `inherit_disclaimer_from_org`, `inherit_print_footer_from_org`, `inherit_logo_from_org`, `inherit_seal_from_org`, `inherit_location_from_org`, and `inherit_dms_folder_from_org`.
- `useOrgManagement.ts` already normalizes inherit flags on save based on whether override values are present.
- Department Effective Preview already traces organisation vs department source for many slots.

Gaps:
- Some asset slots are treated differently from letterhead/signature/footer/disclaimer.
- Department asset fallback trace says there is no equivalent organisation slot in some cases, even though organisation defaults exist for several assets.
- Department override should be valid only when the corresponding inherit flag is false.

Required changes:
- Align all asset slots to the same inheritance pattern: inherit by default, override only when explicitly configured.
- Strengthen Department Effective Preview so it shows: inherited from organisation, overridden by department, unresolved, inactive, or missing.
- Validate that if `inherit_*_from_org = false`, the department override must be populated and active.

Acceptance criteria:
- Department with no overrides exactly matches organisation defaults.
- Department with one override changes only that slot.
- Department with invalid override shows validation error.
- Department cannot silently fall back to an inactive or missing override without warning.

### 3. Module ownership

Current strengths:
- `app_modules` and `owner_department_id` exist.
- `enterpriseContextResolver` loads module and module profile.

Gaps:
- Module ownership and department resolution need to be made consistent.
- Module should not maintain independent branding/template settings except through controlled module-level override records.

Required changes:
- For every module, ensure `owner_department_id` or module-department mapping is configured.
- Module-level overrides should be resolved through central assignment/profile only.

Acceptance criteria:
- Every active module resolves an owner department.
- If owner department is missing, health dashboard reports warning/error.
- Module-level override never creates duplicate master data.

### 4. Enterprise Context Resolver

Current strengths:
- `src/lib/enterprise/enterpriseContextResolver.ts` already declares itself as the single entry point.
- It contains the intended resolution order: template/document, module, department, location, organisation, system fallback.

Gaps:
- Other resolvers still coexist and may be called directly by modules.
- Enterprise resolver needs to become the common dependency under `CommunicationResolver`, `NotificationResolver`, and document generation.

Required changes:
- Make `CommunicationResolver` use `resolveEnterpriseContext()` for context instead of independently resolving org/dept/module.
- Make notification and document generation consume the same enterprise context.
- Do not remove old resolvers immediately; keep them as wrappers during migration.

Acceptance criteria:
- One trace is produced for organisation, department, module, location, and each branding slot.
- All communication-producing flows expose the same resolved organisation and department values.

## Implementation sequence

### Sprint 1 — Audit and guardrails

1. Inventory direct reads of restricted tables outside allowed resolver/admin folders:
   - `core_organization`
   - `core_department_profile`
   - `comm_letterhead`
   - `comm_email_signature`
   - `comm_disclaimer`
   - `comm_print_footer`
   - `comm_media_asset`
   - `core_template`
   - `notification_templates`
2. Classify every usage as:
   - Allowed admin maintenance screen
   - Allowed resolver
   - Legacy bridge to migrate
   - Invalid module direct read
3. Add report output to Enterprise Health before enforcing build failure.

### Sprint 2 — Resolver hardening

1. Harden `enterpriseContextResolver` as the canonical resolver.
2. Ensure departmentCode and moduleCode resolution are both supported.
3. Align asset inheritance for logo/seal/watermark with the same org -> department override model.
4. Expand trace output for every slot.

### Sprint 3 — Department preview and health

1. Update Department Effective Preview to use the same enterprise context result.
2. Add health checks for missing/invalid/inactive organisation and department defaults.
3. Add warnings for department override flag false with no active override.

### Sprint 4 — Controlled migration

1. Convert one low-risk module communication path to enterprise context.
2. Convert Legal document/email path.
3. Convert Benefits document/email path.
4. Keep old paths as compatibility wrappers until validation is clean.

## Testing plan

### Unit tests

Create resolver tests for:

| Test | Setup | Expected |
|---|---|---|
| Organisation default | Org has defaults, department inherits | Organisation value wins |
| Department override | Department flag false and override set | Department value wins |
| Department inherit | Department flag true even with old override value | Organisation value wins |
| Missing org default | No org and no dept value | Missing trace + warning |
| Inactive override | Department override points inactive row | Warning/error |
| Module override | Module override configured | Module value wins before department |
| Template override | Template assignment configured | Template value wins before module |

### Manual UAT matrix

Create three departments:

1. Department A — inherits all organisation settings.
2. Department B — overrides only letterhead.
3. Department C — overrides only email signature and DMS folder.

Generate for each department:
- Email notification
- PDF letter
- Official notice
- Portal/in-app message

Expected:
- Department A matches organisation defaults exactly.
- Department B changes only letterhead.
- Department C changes only email signature and DMS folder.
- No module-specific hardcoded address, logo, footer, or disclaimer appears.

### Validation testing

Run:

```bash
bun run test
bun run lint
bun run build
```

Then run Enterprise Health and confirm:
- No missing organisation profile.
- No orphan department profile.
- No missing parent template.
- No missing text block reference.
- No unmapped active legacy notification template for migrated flows.

## Definition of done

Epic 1 is done when:
- Organisation profile is the only source for enterprise defaults.
- Organisation defaults are validated and visible through resolver trace.
- No module duplicates organisation-level settings.

Epic 2 is done when:
- Department settings inherit organisation defaults by default.
- Department overrides work only through explicit inherit flags.
- Department Effective Preview and Enterprise Health show exact source for every resolved setting.
- Invalid/missing/inactive overrides are visible before production use.

## Notes

No rebuild is recommended at this stage. The current repo already has most of the required foundation. The work is primarily hardening, alignment, migration, validation, and enforcement.
