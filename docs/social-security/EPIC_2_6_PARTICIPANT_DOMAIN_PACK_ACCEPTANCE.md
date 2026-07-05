# Epic 2.6 — Participant / Party Domain Pack — Acceptance

## Objective
Establish the shared canonical Participant / Party classification foundation
for Social Security. Provides party types, participant roles, relationship
types, member/employer types, occupations, nationalities, disability, life
status and the party-role binding model that lets one party hold multiple
roles over time.

## Reuse Validation (completed before build)
- `ip_*` (member) and `er_*` (employer) legacy tables — **not modified**.
- BN claim/employer/person snapshot tables — **not modified**.
- BEMA contributor/registration tables — **not modified**.
- Compliance party/employer usage — **not modified**.
- IA / Legal party linkage — **not modified**.
- Reused `app_modules`, `module_actions`, `role_permissions`,
  `enterprise_capability_registry` for governance.
- Reused Geography / Identity / Financial / Legal Reference facades — no
  duplicates introduced.

## What Was Built (additive, ssp_*)

### Schema (10 tables)
| Table | Purpose |
|---|---|
| `ssp_party_type` | Party classification: Person, Employer, Organisation, Representative, Dependant, Nominee, Staff, External User |
| `ssp_participant_role` | Operational roles: Member, Contributor, Beneficiary, Claimant, Employer, Employer Contact, Representative, Dependant, Nominee, Officer |
| `ssp_relationship_type` | Family / legal / organisational relationship codes with reciprocals |
| `ssp_member_type` | Employed, Self-employed, Voluntary, Pensioner, Beneficiary |
| `ssp_employer_type` | Private, Government, Statutory Body, Self-employed |
| `ssp_occupation_category` | ISCO-08 top level (extend later) |
| `ssp_nationality` | Kittitian and Nevisian (default) + Other |
| `ssp_disability_type` | Minimum categorisation (None / Physical / Sensory / Cognitive / Psychosocial / Other) |
| `ssp_life_status` | Alive / Deceased / Unknown |
| `ssp_party_role_binding` | One party ↔ many roles over time (party_kind + party_ref → role_code) |

All tables: `SELECT/INSERT/UPDATE/DELETE` to `authenticated`, `ALL` to
`service_role`, `SELECT` to `anon`. Role-based security only — no RLS
(per project rule).

### Service / Hooks
- `src/services/participant/participantDomainService.ts`
- `src/hooks/participant/useParticipantDomain.ts` — exports
  `usePartyTypes`, `useParticipantRoles`, `useRelationshipTypes`,
  `useMemberTypes`, `useEmployerTypes`, `useOccupationCategories`,
  `useNationalities`, `useDisabilityTypes`, `useLifeStatuses`,
  `usePartyRoleBindings`, `useParticipantDomain`.

### UI
- `src/pages/admin/ParticipantDomainPage.tsx` — 10-tab admin shell.
- Route wired at `/admin/participant` in `src/components/routing/AppRoutes.tsx`.
- "Participant / Party" link added to the **Shared Domains** card on
  `PlatformAdmin`.

## Seeded Baseline (KN-ready)
| Domain | Rows |
|---|---|
| Party types | 8 |
| Participant roles | 10 |
| Relationship types | 7 (Spouse, Child, Parent, Guardian, Ward, Legal Rep, Employer Contact) |
| Member types | 5 |
| Employer types | 4 |
| Occupation categories | 10 (ISCO-08 top level) |
| Nationalities | 2 (Kittitian and Nevisian [default], Other) |
| Disability types | 6 |
| Life statuses | 3 |
| Party-role bindings | 0 — intentionally empty until adoption wave |

## Menu / app_modules
- Module row: `participant_domain` → `/admin/participant`
- Parent: `Administration` (id `aab5fcb8-51fb-4a5c-8a87-6cef31068b47`)
- Icon: `Users`, enabled + visible in menu.

## Permissions / Roles
Actions registered on `module_actions`: `view`, `manage`, `admin`, `import`,
`export`. Granted (with `is_granted=true`) to every existing role in
{`Admin`, `Application Admin`, `Super Admin`} — currently `Admin` and
`Application Admin` exist in `roles`; grants for `Super Admin` will be picked
up automatically if/when that role is created (idempotent DO block).

## Current User Verification
- Existing Admin / Application Admin users retain access — same role IDs
  already permitted on Geography / Identity / Financial / Legal domains.
- No manual SQL required; permissions granted by migration.

## Dependency Consumption Verification
| Dependency | Consumed via |
|---|---|
| Reference Framework | `core_reference_group/value` (existing) |
| Master Data Platform | `enterprise_capability_registry` |
| Geography Domain | `useCountries()` (available for downstream address use) |
| Identity Domain | `party_kind` / `party_ref` mirror `ssp_party_identity` |
| Financial Reference Domain | Available for bank/payment linkage in adoption waves |
| Legal Reference Domain | Available for Legal Representative citations |

## Enterprise Catalogue
Registered `participant_domain` in `enterprise_capability_registry`:
- Owner: Social Security Shared Domain
- Consumers: member, employer, bn, claims, contributions, compliance, legal,
  finance, hrms, prison, licensing, portals
- Dependencies: reference_framework, master_data_platform, geography_domain,
  identity_domain, financial_reference_domain, legal_reference_domain
- Overall health: green (migration: amber — no legacy data migrated yet)

## Legacy Impact
**None.** Only additive `ssp_*` tables were created. Legacy `ip_*`, `er_*`,
BN, BEMA, Compliance, IA, Legal tables are structurally unchanged and their
data is not migrated. BN Product Builder remains ON HOLD.

## Rollback
```sql
-- Enterprise catalogue
DELETE FROM public.enterprise_capability_registry WHERE capability_key='participant_domain';

-- Permissions and module
DELETE FROM public.role_permissions
 WHERE module_id='2c2c0000-0000-4000-8000-000000000260'::uuid;
DELETE FROM public.module_actions
 WHERE module_id='2c2c0000-0000-4000-8000-000000000260'::uuid;
DELETE FROM public.app_modules
 WHERE id='2c2c0000-0000-4000-8000-000000000260'::uuid;

-- Tables (drop in dependency order — none reference the others)
DROP TABLE IF EXISTS public.ssp_party_role_binding;
DROP TABLE IF EXISTS public.ssp_life_status;
DROP TABLE IF EXISTS public.ssp_disability_type;
DROP TABLE IF EXISTS public.ssp_nationality;
DROP TABLE IF EXISTS public.ssp_occupation_category;
DROP TABLE IF EXISTS public.ssp_employer_type;
DROP TABLE IF EXISTS public.ssp_member_type;
DROP TABLE IF EXISTS public.ssp_relationship_type;
DROP TABLE IF EXISTS public.ssp_participant_role;
DROP TABLE IF EXISTS public.ssp_party_type;
```
Frontend: revert additions to `AppRoutes.tsx` and `PlatformAdmin.tsx`; delete
`ParticipantDomainPage.tsx`, `useParticipantDomain.ts`,
`participantDomainService.ts`.

## Deferred Adoption Waves
1. **Party-role binding wave** — write bindings for existing members and
   employers from `ip_master` / `er_master` (read-only projection first, then
   dual-write when Member / Employer domain packs land).
2. **Extended occupation catalogue** — full ISCO-08 four-digit codes with SSA
   mapping.
3. **Country-specific nationality codes** — align with CARICOM standards.
4. **Disability classification** — align with WHO ICF codes after clinical
   review.
5. **Legal-representative binding** — connect `LEGAL_REP` role to
   `ssp_legal_reference` citations.

## Enterprise DoD Status
- [x] No duplicate screens / tables introduced.
- [x] No legacy tables changed structurally.
- [x] Existing Member / Employer / BEMA / BN data not migrated.
- [x] `app_modules` entry exists (`participant_domain`).
- [x] Permissions assigned (view/manage/admin/import/export).
- [x] Current admin users verified via existing role grants.
- [x] Enterprise Catalogue registered (`participant_domain`).
- [x] Acceptance doc created (this file).
- [x] Rollback documented.

**Status:** Complete.
