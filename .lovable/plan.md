## UI Regression Audit — Enterprise Context / Organization Management

### Scope
Audit screens potentially impacted by recent Enterprise Context / Organization resolver work across Legal, Compliance, Benefits, Finance, DMS, and the new Organization Management surface. Restore UI/UX consistency without touching the resolver architecture or business logic.

### Approach (executed as parallel sub-audits)

**Phase 1 — Inventory (read-only, parallel)**
Spawn parallel sub-audits, one per module, each producing a short regression report:
1. **Organization Management** (`/admin/organization-management`, 8 tabs + duplicate `/admin/communication/letterhead`) — check tab bloat, Save/Cancel presence, inherited vs override clarity, hidden technical fields.
2. **Legal** — `LegalLetterhead`, `StagesTab`, workflow admin, letter/template rendering paths. Confirm no organization-admin styling leaked in, department profile still resolves.
3. **Compliance** — audit-report shared components, notice/letter rendering, no UI shape changes.
4. **Benefits** — `ChequePrintView`, payment doc surfaces.
5. **Finance** — `invoicePrinter`, `receiptPrinter`, `CheckPrinting`.
6. **DMS** — `CoreDmsAdmin`, `StorageConfigPanel`, `DmsQueuePanel` — confirmed clean previously, re-verify after later changes.

**Phase 2 — Triage**
Classify each finding as: `restore` (revert UI change), `polish` (tab/save/validation cleanup), `defer` (logic concern, out of scope).

**Phase 3 — Fixes (targeted, no logic changes)**
- **Organization Management tabs**: ensure every tab page has a clear page header, Save/Cancel footer, and validation summary. Split any tab that is a "wall of inputs" into sub-sections. Hide raw resolver/JSON fields behind an "Advanced" toggle.
- **Department Profiles**: replace any free-text header/footer/signature textareas with asset selectors (letterhead / signature / footer pickers) + location selector. Show inherited org defaults as muted placeholders; explicit overrides as filled inputs with a "Reset to inherited" link.
- **Communication Assets** (Media Library, Text Blocks, Letterheads): list/grid first, edit in a drawer or detail route, with preview pane and "Where used" panel. Hide raw HTML behind an Advanced toggle.
- **Usage & Validation**: convert to diagnostic dashboard (issue list + repair actions), not an editor.
- **Legal**: confirm `LegalLetterhead` still wraps legal screens (not replaced by generic org chrome). Restore Legal-specific layout if generic admin styling crept in. Verify `StatusesTab` etc. remain on mock data path until DB-backed (no functional change).
- **Cross-module print/receipt views**: ensure resolver hydration runs but UI layout and field ordering match pre-change snapshots.

**Phase 4 — Verification**
- `tsgo` typecheck.
- Playwright smoke: load each tab of `/admin/organization-management`, the Legal workbench, one Compliance letter preview, one Benefits cheque preview, one Finance receipt preview. Capture screenshots.
- Confirm no console errors on each route.

### Technical Notes
- No changes to: `enterpriseContextResolver`, `organizationContextResolver`, `communicationResolver`, Supabase schemas, RPCs, or business logic.
- All edits stay in presentation components (`src/pages/admin/organization/*`, `src/components/legal/*`, print/receipt view components).
- Inherited-vs-override pattern: use shadcn `Input` with `placeholder={inheritedValue}` + small muted label "Inherited from Organization"; when value is explicit, show "Override" badge + "Reset" link that clears the field.
- Advanced toggle: per-page `useState<boolean>` gating raw HTML / JSON / resolver-trace blocks.

### Deliverable
A single report message listing: screens reviewed, regressions found, fixes shipped, remaining risk — followed by a publish suggestion if the typecheck and smoke pass.
