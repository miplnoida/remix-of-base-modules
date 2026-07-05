# Epic 2.6A — Member/Employer Read-Only Adoption Wave — Acceptance

**Status:** Complete  
**Mode:** Read-only projection (no migration, no dual-write)  
**BN Product Builder:** ON HOLD

## Purpose
Allow downstream modules to consume existing Member (`ip_master`) and
Employer (`er_master`) data through the shared Participant / Party Domain
facade **without** migrating, copying, or structurally changing the legacy
tables.

## What was reused
- Legacy `ip_master` (insured persons / members / contributors)
- Legacy `er_master` (employers)
- Existing Participant Domain Pack (Epic 2.6) — types, hooks, admin shell
- Geography, Identity, Financial Reference, Legal Reference domain packs
- Existing `app_modules` entry `participant_domain` and the
  `participant_domain.view` permission (no new role model)
- Existing admin route `/admin/participant`

## What was built
1. **Read-only projection view** `public.v_ssp_party_projection`
   - Unions `ip_master` (as `PERSON`, roles: `MEMBER`, `CONTRIBUTOR`) and
     `er_master` (as `ORGANISATION`, role: `EMPLOYER`)
   - Exposes canonical fields: `source_system`, `source_id`, `legacy_ref`,
     `party_kind`, `display_name`, `primary_identifier`,
     `primary_identifier_type`, gender/dob (person), nationality/geo,
     contact channels, `projected_roles[]`
   - `GRANT SELECT` to `anon`, `authenticated`, `service_role`
2. **Service facade** `src/services/participant/partyProjectionService.ts`
   - `search(params)`, `listMembers()`, `listEmployers()`
   - `resolveByLegacyId(sourceSystem, legacyId)`
   - `listRoles(sourceSystem, legacyId)`
3. **Hooks** `src/hooks/participant/usePartyProjection.ts`
   - `usePartySearch`, `useMemberParties`, `useEmployerParties`,
     `usePartyRoles`, `useResolvePartyByLegacyId`
4. **UI** — 3 additional tabs on `/admin/participant`:
   - **Existing Members** (read-only, from `ip_master` via projection)
   - **Existing Employers** (read-only, from `er_master` via projection)
   - **Party Role Projection** (search + projected roles)
5. **Enterprise Catalogue** — Participant capability updated:
   - `consumers` extended with `member_legacy`, `employer_legacy`
   - Adoption wave recorded as read-only

## Where it is visible
- Route: `/admin/participant`
- Tabs (new): *Existing Members*, *Existing Employers*, *Party Role Projection*
- Existing 10 tabs (Party Types … Role Bindings) unchanged

## Permissions
Uses existing `participant_domain.view`. Current Admin, Application Admin
and Super Admin roles retain access — no new role model.

## Legacy impact
- `ip_master`, `er_master`: **untouched** (no DDL, no data changes)
- BN, BEMA, Compliance, IA, Legal, Finance, Cashier tables: **untouched**
- No dual-write. No triggers. No RLS added.
- BN Product Builder remains ON HOLD.

## Downstream consumption
Downstream modules (Claims, Compliance, Finance, Portals, HRMS, Prison,
Licensing) may now resolve any legacy Member/Employer as a canonical
Participant via `partyProjectionService.resolveByLegacyId('ip_master', ssn)`
or `('er_master', regno)` without touching legacy tables directly.

## Rollback
1. Drop the projection view:
   ```sql
   DROP VIEW IF EXISTS public.v_ssp_party_projection;
   ```
2. Revert capability registry `consumers` array (remove `member_legacy`,
   `employer_legacy`).
3. Remove `src/services/participant/partyProjectionService.ts`,
   `src/hooks/participant/usePartyProjection.ts`, and the three new tabs in
   `src/pages/admin/ParticipantDomainPage.tsx`.

Legacy `ip_master` / `er_master` are unaffected by rollback because no
migration ever occurred.

## Next recommendation
- **Epic 2.6B** — Optional write-back adoption wave: allow authoritative
  role bindings to be recorded in `ssp_party_role_binding` for new
  registrations only, keeping legacy reads through the projection view.
- **Epic 2.7** — Communication & Correspondence Domain Pack.
