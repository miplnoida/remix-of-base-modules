# Epic 2.7 — Communication & Correspondence Domain Pack — Acceptance

**Status:** Complete
**Mode:** Additive shared-domain foundation (no parallel engine, no legacy DDL)
**BN Product Builder:** ON HOLD

## Purpose
Establish the canonical shared foundation for communication and
correspondence configuration — channels, correspondence types, recipient
preferences, template bindings, legal notice mapping, delivery statuses
and external provider code mapping — so every module consumes one
consistent facade instead of building parallel notification engines.

## What was reused
- **notification_templates** (Notification Templates admin at `/admin/notification-templates`) — template source of truth. This domain only *binds* templates; it never authors them.
- **comm_*** assets (`comm_letterhead`, `comm_email_signature`, `comm_disclaimer`, `comm_layout_block`, `comm_media_asset`, `comm_print_footer`, etc.) — unchanged, linked by reference.
- **Participant Domain Pack (2.6)** + **Member/Employer Read-Only Adoption (2.6A)** — recipient resolution via `v_ssp_party_projection`.
- **Identity Domain Pack (2.3)** — party identifier resolution.
- **Legal Reference Domain Pack (2.5)** — legal-notice citations.
- **Enterprise Reference Framework** — classification codes.
- Existing legacy communication tables (BN `bn_communication_log`, BN `bn_letter`, Legal `lg_notice`, Compliance `ce_notice_*`, IA `ia_communications`, BEMA correspondence) — **untouched**. They remain the systems of record for their domain-specific events.

## What was built
Additive `ssp_*` reference tables:
1. `ssp_communication_channel` (7 seeded: EMAIL, SMS, LETTER, PORTAL, WHATSAPP, VOICE, IN_APP)
2. `ssp_correspondence_type` (8 seeded: compliance, legal, general letter, statements, receipts, reminders, benefit award/decision)
3. `ssp_recipient_preference` (per-party channel opt-in / preferred)
4. `ssp_correspondence_template_binding` (correspondence + channel → template ref in `notification_templates`)
5. `ssp_correspondence_legal_ref` (correspondence → legal reference code)
6. `ssp_delivery_status_ref` (8 seeded: QUEUED, SENT, DELIVERED, READ, FAILED, BOUNCED, OPTED_OUT, EXPIRED)
7. `ssp_external_provider_code` (provider status/type mapping)

Service facade `src/services/communication/communicationDomainService.ts`:
- `listCommunicationChannels`, `listCorrespondenceTypes`, `listDeliveryStatuses`
- `listRecipientPreferences(partySource, partyRef)`
- `listTemplateBindings(correspondenceCode?)`, `listLegalNoticeMappings`
- `listProviderCodes`
- `resolveRecipient(partySource, legacyId)` — party + prefs + preferred channel

Hooks `src/hooks/communication/useCommunicationDomain.ts`:
- `useCommunicationChannels`, `useCorrespondenceTypes`, `useDeliveryStatuses`
- `useRecipientPreferences`, `useTemplateBindings`, `useLegalNoticeMappings`
- `useProviderCodes`, `useResolveRecipient`

UI `src/pages/admin/CommunicationDomainPage.tsx` — 8 tabs:
Channels · Correspondence Types · Recipient Preferences · Template Bindings ·
Legal Notice Mapping · Delivery Statuses · Provider Codes · Recipient Resolver.

## Where screens are accessible
- Route: `/admin/communication-domain`
- Platform Admin → **Shared Domains** → "Communication & Correspondence"
- Existing `/admin/notification-templates` remains intact (linked from this page).

## How recipient resolution works
Consumers call `communicationDomainService.resolveRecipient('ip_master', ssn)`
or `('er_master', regno)` → the service delegates to
`partyProjectionService.resolveByLegacyId(...)` which reads the read-only
projection view `v_ssp_party_projection`. The returned `ResolvedRecipient`
carries the canonical `PartyProjection`, all `ssp_recipient_preference`
rows, and the resolved preferred channel. **No legacy table is queried
directly** and no dual-write occurs.

## How the template designer is reused
`ssp_correspondence_template_binding.template_source` defaults to
`notification_templates` and `template_ref` stores the notification
template id. The Template Bindings tab renders the binding + a link to
`/admin/notification-templates` where the actual template is authored,
versioned and approved. No parallel template engine was built.

## Menu / app_modules
- `app_modules.name = 'communication_domain'`, route `/admin/communication-domain`
- Parent: Shared Domains (same parent as Geography/Identity/Financial/Legal/Participant)
- `module_actions`: `view`, `manage`, `admin`, `import`, `export`

## Permissions
`role_permissions` granted for all 5 actions to:
- **Admin**
- **Application Admin**

(No `Super Admin` role exists in this project — verified against
`public.roles`. Add there if introduced later.)

Current admin users retain access — permission uses the existing
role-based framework; no new role model.

## Enterprise Catalogue
Registered capability `communication_domain`:
- `consumers`: bn, claims, compliance, legal, employer, member, finance, hrms, portals
- `dependencies`: participant_domain, identity_domain, legal_reference_domain, reference_framework, notification_templates
- `canonical_route`: /admin/communication-domain
- `permission_hint`: communication_domain.view

## Legacy impact
**None.** Zero DDL on `comm_*`, `notification_*`, `bn_*`, `lg_*`, `ce_*`, `ia_*`, `bema_*`.
No dual-write. No triggers on legacy tables. BN Product Builder remains ON HOLD.

## Rollback
```sql
-- Reference tables
DROP TABLE IF EXISTS public.ssp_external_provider_code CASCADE;
DROP TABLE IF EXISTS public.ssp_correspondence_legal_ref CASCADE;
DROP TABLE IF EXISTS public.ssp_correspondence_template_binding CASCADE;
DROP TABLE IF EXISTS public.ssp_recipient_preference CASCADE;
DROP TABLE IF EXISTS public.ssp_delivery_status_ref CASCADE;
DROP TABLE IF EXISTS public.ssp_correspondence_type CASCADE;
DROP TABLE IF EXISTS public.ssp_communication_channel CASCADE;

-- Governance
DELETE FROM public.enterprise_capability_registry WHERE capability_key = 'communication_domain';
DELETE FROM public.role_permissions
 WHERE module_id = (SELECT id FROM public.app_modules WHERE name = 'communication_domain');
DELETE FROM public.module_actions
 WHERE module_id = (SELECT id FROM public.app_modules WHERE name = 'communication_domain');
DELETE FROM public.app_modules WHERE name = 'communication_domain';
```
Then remove `src/services/communication/`, `src/hooks/communication/`,
`src/pages/admin/CommunicationDomainPage.tsx`, the route, and the menu link.

Legacy `notification_*` and `comm_*` remain untouched by rollback.

## Next recommendation
- **Epic 2.7A** — KN seed pack for template bindings (bind existing notification templates to correspondence types by channel) and initial legal-notice mappings.
- **Epic 2.8** — Finance / Ledger consumption model (or Case/Workflow domain pack).
