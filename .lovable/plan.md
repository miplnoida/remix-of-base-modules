# Organization Communication Management — Architectural Redesign

This is an architecture proposal only. No code will change until you approve.

## 1. Proposed Information Architecture

Everything collapses into **five lifecycle stages**, not nine sibling pages:

```text
1. FOUNDATION      → Who we are (Organization, Locations, Departments, Modules)
2. ASSETS          → What we brand with (logos, seals, letterheads, signatures, fonts, themes)
3. LIBRARY         → What we say (templates, text blocks, tokens, categories, channels, languages)
4. ASSIGNMENT      → Who uses what, where, when (the Communication Assignment Center)
5. VALIDATION      → Is it healthy? (missing, unused, broken, impact graph)
```

Runtime is a consumer of stage 4 only. Modules (Legal, Benefits, Compliance, Procurement…) never reach into stages 1–3 directly.

## 2. Proposed Menu Structure

Replace the current 9 tabs with 5 top-level sections under **Organization Management**:

```text
Organization Management
├── Foundation
│   ├── Organization Profile
│   ├── Locations & Branches
│   ├── Departments
│   └── Modules
├── Brand Assets
│   ├── Media Library (logos, seals, watermarks, QR, backgrounds)
│   ├── Letterheads
│   ├── Signatures
│   ├── Headers & Footers
│   ├── Fonts & Themes
│   └── Asset Categories (admin)
├── Communication Library
│   ├── Templates (Email / Letter / Notice / PDF / SMS / WhatsApp / Push)
│   ├── Text Blocks
│   ├── Tokens
│   ├── Categories
│   ├── Channels
│   └── Languages & Translations
├── Assignment Center
│   └── Unified assignment grid (see §3)
└── Validation & Impact
    ├── Health Dashboard
    ├── Usage Graph
    └── Impact Analysis
```

Menu labels answer the admin's four questions: *What am I creating? Where is it used? Who uses it? What happens at runtime?*

## 3. Proposed Navigation Flow

The admin follows the lifecycle top-to-bottom:

```text
Foundation ──► Brand Assets ──► Library ──► Assignment ──► Validation
   (setup)      (create)       (create)     (configure)   (verify)
                                                 │
                                                 ▼
                                          Runtime Resolver
                                          (read-only consumer)
```

Assignment Center is the **only** place where "who gets what" is decided. Assets and Library screens have no "assign" button — they only create/edit/version/activate.

## 4. Screen Consolidation Recommendations

| Today | Tomorrow | Action |
|---|---|---|
| Organization Profile | Foundation › Organization | Keep |
| Locations & Branches | Foundation › Locations | Keep |
| Department Profiles | Foundation › Departments | Move out of "Comm" |
| Module Profiles | Foundation › Modules | Move out of "Comm" |
| Communication Assets | Brand Assets › Media Library | Rename + narrow scope |
| Asset Category Master | Brand Assets › Asset Categories | Demote to sub-page |
| Text Blocks | Library › Text Blocks | Move |
| (new) Templates | Library › Templates | Absorb from Core Template Mgmt entry point |
| Asset Assignments | **Assignment Center** | Rewrite as unified grid |
| Usage & Validation | Validation & Impact | Expand into graph + impact |

## 5. Which Existing Pages Remain (as-is)

- Organization Profile
- Locations & Branches
- Letterheads editor (moves under Brand Assets, same editor)
- Text Blocks editor (moves under Library, same editor)

## 6. Which Pages Merge

- **Communication Assets + Letterheads + Signatures + Headers/Footers + Media Library** → one **Brand Assets** section with sub-tabs per asset type (shared underlying `comm_media_asset` + typed views).
- **Department Profiles + Module Profiles** → **Foundation › Scopes** (two tabs, same shell) — they're both scope definitions, not comm configuration.

## 7. Which Pages Become Tabs

Inside **Brand Assets**: Media / Letterheads / Signatures / Headers / Footers / Fonts / Themes / Categories.
Inside **Library**: Templates / Text Blocks / Tokens / Categories / Channels / Languages.
Inside **Validation**: Health / Usage Graph / Impact / Broken References.

## 8. Which Pages Become Dialogs

- "Assign asset to scope" — dialog opened from Assignment Center row (never a standalone page).
- "New version" for any asset — dialog, not a page.
- "Preview at scope" — dialog with the resolver trace inline.
- "Where used?" — slide-over panel from any asset/template/text block.

## 9. Route Changes

```text
OLD                                                   NEW
/admin/organization-management?tab=organization    →  /admin/org/foundation/profile
/admin/organization-management?tab=locations       →  /admin/org/foundation/locations
/admin/organization-management?tab=departments     →  /admin/org/foundation/departments
/admin/organization-management?tab=modules         →  /admin/org/foundation/modules
/admin/organization-management?tab=assets          →  /admin/org/assets/media
/admin/organization-management?tab=asset-categories→  /admin/org/assets/categories
   (letterheads dialog today)                      →  /admin/org/assets/letterheads
/admin/organization-management?tab=text-blocks     →  /admin/org/library/text-blocks
   (templates today live in Core Template Mgmt)    →  /admin/org/library/templates
/admin/organization-management?tab=assignments     →  /admin/org/assignment-center
/admin/organization-management?tab=usage           →  /admin/org/validation
```

Old routes 301-redirect to new ones for one release.

## 10. Migration Plan (phased, non-breaking)

1. **Phase 0 — Freeze scope.** Approve this IA. Lock naming.
2. **Phase 1 — Shell.** New 5-section shell + routes + redirects from old tabs. No data change.
3. **Phase 2 — Foundation.** Move Departments/Modules under Foundation. Pure re-parenting.
4. **Phase 3 — Brand Assets.** Consolidate Media/Letterheads/Signatures/Headers/Footers/Categories under one shell with typed tabs. Remove "assign" affordances from these screens.
5. **Phase 4 — Library.** Bring Templates into Organization Management as the canonical entry; Text Blocks/Tokens/Categories/Channels/Languages join as tabs.
6. **Phase 5 — Assignment Center.** Rewrite Asset Assignments as the unified grid (scope × resource-type × resource × rules). New table `core_communication_assignment` supersedes `comm_asset_assignment` (keeps a view for back-compat).
7. **Phase 6 — Validation & Impact.** Extend today's Usage & Validation with dependency graph + impact analysis queries.
8. **Phase 7 — Runtime cutover.** Point `resolveCommunication()` at Assignment Center exclusively; deprecate direct `comm_*` reads from modules. Add a lint rule.
9. **Phase 8 — Cleanup.** Drop old routes, old assignment tables, old direct-module template code.

## 11. Data Impact

- **New table:** `core_communication_assignment` — one row per (scope, resource_type, resource_id, rule_set). Unifies today's per-type assignment tables.
- **Kept unchanged:** `comm_media_asset`, `comm_letterhead`, `comm_email_signature`, `comm_disclaimer`, `comm_print_footer`, `core_template*`, `core_text_block`.
- **View shim:** `comm_asset_assignment_v` view over the new table so legacy readers keep working during Phase 5–7.
- **Codes:** all new resources use the central numbering engine (already in place). Legacy codes stay via `legacy_code`.
- **Text Blocks language/category:** already sourced from `CORE_LANGUAGE` and `CORE_TEXT_BLOCK_CATEGORY` — no further change.

## 12. Permission Impact

New capability keys, mapped to existing roles:

```text
org.foundation.manage       ← existing Org Admin
org.assets.manage           ← existing Brand Admin (was "assets" perm)
org.library.manage          ← existing Template Admin (was split across screens)
org.assignment.manage       ← NEW — gate the Assignment Center
org.validation.view         ← everyone with any org.* perm
```

The current `organization_management` PermissionWrapper stays as the umbrella; sub-caps are checked per section. No user loses access; some gain finer-grained control.

## 13. Workflow Impact

- Workflows stop referencing templates/assets directly. They reference a **Business Event key**.
- Assignment Center maps (Workflow, Stage, Business Event) → (Template, Assets, Channel, Language, Fallback).
- Existing workflow rows get a one-time backfill migration that inserts equivalent assignments.
- Workflow editors gain a read-only "Resolved communication" preview panel that calls the resolver.

## 14. Template Impact

- Templates lose per-template asset pickers ("logo for this template"). Assets resolve through Assignment Center at runtime with fallback to org default.
- Template editor gains a "Test resolve" panel: pick a scope → see the exact assets, text blocks, tokens, language and channel that will be used.
- Duplicate templates across modules can be de-duplicated because assignment is now scope-based.

## 15. Runtime Impact

`resolveCommunication()` becomes:

```text
input : { moduleCode, workflowCode?, stageCode?, businessEvent, scopeHints }
         │
         ▼
   Assignment Center lookup (scope precedence: workflow-stage > workflow > module > dept > org > global)
         │
         ▼
   Template + Assets + Text Blocks + Tokens + Language + Channel + Fallback
         │
         ▼
   Render / Deliver
```

Modules pass **intent** (business event + scope), never **artifacts**. Adding Procurement means: define its module + business events + assignments. Zero new template code.

## Approval gate

Please confirm:

1. The five-section IA and menu structure.
2. Route changes with redirects.
3. Introducing `core_communication_assignment` as the unified assignment table.
4. Cutting modules off from direct `comm_*` reads at Phase 7.

On approval I'll execute Phase 1 (shell + redirects) as the first shippable slice, then proceed phase by phase.