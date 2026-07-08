/**
 * Organisation Management — Business Case narratives.
 *
 * Each entry frames the corresponding master screen from a business outcome
 * point of view: WHO uses it, WHY it matters, WHAT it unlocks downstream,
 * and typical real-world scenarios. Rendered at the top of every manual
 * page (above the master-screen how-to) and included in PDF / DOCX exports.
 */
export interface BusinessCase {
  /** One-line executive summary. */
  summary: string;
  /** "Who benefits" — the personas / roles that gain from configuring this. */
  audience: string[];
  /** Outcomes the org achieves once this is configured correctly. */
  outcomes: string[];
  /** Real-world scenarios that drive people to this screen. */
  scenarios: { title: string; body: string }[];
  /** What breaks / what is missed if this is skipped or misconfigured. */
  risksIfSkipped: string[];
}

const bc = (b: BusinessCase) => b;

export const BUSINESS_CASES: Record<string, BusinessCase> = {
  'overview': bc({
    summary:
      'Organisation Management is the control tower that lets every business module — Employer, Compliance, Benefits, Legal, Finance — speak with one consistent official voice and follow one consistent governance model.',
    audience: [
      'System Administrators standing up a new tenant or country deployment',
      'Business Process Owners who decide branding, workflows and communication policy',
      'Module Product Owners integrating a new business module',
    ],
    outcomes: [
      'Every letter, notice, SMS, email and portal message is on-brand and legally compliant, regardless of which module generated it',
      'Branding, disclaimers and approvers change in ONE place and propagate everywhere',
      'New modules go live in days, not weeks, because settings already exist',
    ],
    scenarios: [
      {
        title: 'Rebranding after a merger',
        body: 'Legal name and letterhead change org-wide. Change the Organisation Profile once — every module’s next document uses the new brand automatically.',
      },
      {
        title: 'Opening a new country / branch',
        body: 'A new Location + Department is created with its own letterhead and language. All modules serving that branch immediately produce localised, correctly branded output.',
      },
    ],
    risksIfSkipped: [
      'Each module invents its own letterhead, signature and disclaimer — inconsistent brand and legal exposure',
      'A rebrand becomes a multi-week code change instead of a config change',
    ],
  }),

  'configuration-order': bc({
    summary:
      'Configuration must follow a specific dependency order. Skipping steps produces empty pickers, broken previews and modules that cannot go live.',
    audience: [
      'Implementation leads planning a rollout',
      'Admins onboarding a fresh environment',
    ],
    outcomes: [
      'Predictable, auditable rollout schedule',
      'No “chicken and egg” blockers during UAT',
      'Every downstream module hits a green readiness check on day one',
    ],
    scenarios: [
      {
        title: 'Greenfield tenant go-live',
        body: 'Following the golden path lets an implementation team stand up a fully brandable, fully governed org in a predictable number of days.',
      },
      {
        title: 'Adding a new business module (e.g. Benefits) to an existing tenant',
        body: 'Only the last three steps (Assignments → Validation → Consumption) are usually needed, because Foundation + Assets + Library already exist.',
      },
    ],
    risksIfSkipped: [
      'Templates authored before layouts exist must be re-worked',
      'Assignments made before templates are active create dangling references flagged in Broken References',
    ],
  }),

  'foundation-profile': bc({
    summary:
      'The Organisation Profile is the legal identity and default brand of the tenant. Everything else inherits from here.',
    audience: [
      'System Administrator',
      'Compliance Officer confirming legal identity on outbound documents',
    ],
    outcomes: [
      'One canonical legal name, address and default channel used across all official communication',
      'A single knob to rebrand the entire organisation',
    ],
    scenarios: [
      {
        title: 'First-time environment setup',
        body: 'Populate legal name, primary address, default letterhead, default language and default channel. Every department starts life inheriting these values.',
      },
      {
        title: 'Change of default correspondence language',
        body: 'Flip the org default language — every template without an explicit language variant now falls back to the new language.',
      },
    ],
    risksIfSkipped: [
      'Department overrides have nothing to inherit from → empty letterheads and signatures on real letters',
      'Business modules cannot resolve org-level defaults and fail readiness checks',
    ],
  }),

  'foundation-locations': bc({
    summary:
      'Locations model the physical / logical branches. They give letters a real return address and let reports be sliced by branch.',
    audience: [
      'Ops Manager opening a new office',
      'Reporting analyst who needs branch-level filters',
    ],
    outcomes: [
      'Branch-accurate return addresses on printed letters',
      'Location-scoped assignments in the Configuration Center (e.g. a footer that only appears on Basseterre correspondence)',
    ],
    scenarios: [
      {
        title: 'New branch office opens',
        body: 'Create the location, mark it active, set its timezone. Departments hosted there now show the correct address on outbound letters.',
      },
    ],
    risksIfSkipped: [
      'Letters go out with the head office address for a branch case → poor customer experience and misdirected replies',
    ],
  }),

  'foundation-departments': bc({
    summary:
      'Departments are the primary override layer. This is where most real-world brand and communication differences are configured.',
    audience: [
      'Head of Department wanting their own letterhead and signature',
      'Admin implementing a departmental rebrand without disturbing peer departments',
    ],
    outcomes: [
      'Each department speaks in its own voice while still inheriting anything it has not customised',
      'One-click revert to org defaults using inherit_*_from_org flags',
    ],
    scenarios: [
      {
        title: 'Legal Department needs its own letterhead and disclaimer',
        body: 'Uncheck the two inherit flags, pick the department letterhead and legal disclaimer. Every letter generated for a Legal case now uses them.',
      },
      {
        title: 'Field Operations wants org branding but their own signature block',
        body: 'Leave everything inherited except signature — override only the signature; all other assets stay in sync with the org.',
      },
    ],
    risksIfSkipped: [
      'All departments look identical even where regulation requires distinct footers or signatories',
    ],
  }),

  'foundation-modules': bc({
    summary:
      'Modules describe which business capabilities are switched on and let you apply module-wide defaults that cut across all departments.',
    audience: [
      'Platform admin onboarding a new business module (e.g. LEGAL, BENEFITS)',
    ],
    outcomes: [
      'A single place to declare “every BENEFITS communication uses this print footer”',
      'A stable code that every business module uses to look up its settings',
    ],
    scenarios: [
      {
        title: 'Introducing the LEGAL module',
        body: 'Register the LEGAL module and set its owner department. All Legal screens immediately have a valid module context for the settings resolver.',
      },
    ],
    risksIfSkipped: [
      'Business modules cannot be resolved by moduleCode → the readiness API returns not-ready and screens are blocked',
    ],
  }),

  'foundation-designations': bc({
    summary:
      'Designations model the approval hierarchy AND the signature-by-role model. Attaching signatures here keeps letters correct even when the individual approver changes.',
    audience: [
      'HR / Org Design',
      'Workflow owner defining approvers',
    ],
    outcomes: [
      'Approvals routed automatically to the correct role regardless of who currently holds the position',
      'Signatures on official letters follow the role, not the individual',
    ],
    scenarios: [
      {
        title: 'Director of Compliance changes',
        body: 'Reassign the individual to the Director designation — every future letter and approval routes correctly with no template edits.',
      },
    ],
    risksIfSkipped: [
      'Signatures hard-coded to individuals → mass template edits every time a person leaves',
    ],
  }),

  'assets-media': bc({
    summary:
      'The Media Library is the single asset store. Every letterhead, signature, header, footer and portal graphic references it — one upload, everywhere in sync.',
    audience: [
      'Brand / Marketing team providing approved assets',
      'Admin uploading new revisions',
    ],
    outcomes: [
      'Impossible to have two competing versions of the logo in circulation',
      'Replacing a logo is a single upload; every downstream asset picks it up',
    ],
    scenarios: [
      {
        title: 'Logo refresh',
        body: 'Upload the new SVG once — every letterhead, portal and signature block that references it renders the new logo immediately.',
      },
    ],
    risksIfSkipped: [
      'Ad-hoc logos scattered inside individual templates → costly rebrands',
    ],
  }),

  'assets-letterheads': bc({
    summary:
      'Letterheads make every printed letter and PDF look official and legally identifiable. This is where the organisation shows its face to the outside world.',
    audience: [
      'Comms / Brand team',
      'Compliance verifying regulatory disclosure on letterheads',
    ],
    outcomes: [
      'Every module produces official-looking documents',
      'Localised letterheads per language / branch without duplicating template content',
    ],
    scenarios: [
      {
        title: 'Bilingual correspondence',
        body: 'Create two letterhead variants (English + French). Templates automatically pick the correct one based on the recipient language.',
      },
    ],
    risksIfSkipped: [
      'Documents ship with placeholder branding or missing regulatory disclosure',
    ],
  }),

  'assets-signatures': bc({
    summary:
      'Signature blocks close every official letter with the correct name, role and (optionally) scanned signature — driven by role, not by person.',
    audience: [
      'Approvers, Directors, Commissioners',
      'Admins configuring email signatures for outbound channels',
    ],
    outcomes: [
      'Correct signatory on every official communication with zero template edits when people change roles',
    ],
    scenarios: [
      {
        title: 'Commissioner sign-off on statutory notices',
        body: 'Attach the Commissioner signature to the Commissioner designation. Every statutory notice signed by that role uses the correct block.',
      },
    ],
    risksIfSkipped: [
      'Letters go out unsigned or signed by the wrong person',
    ],
  }),

  'assets-headers-footers': bc({
    summary:
      'Headers and footers carry mandatory framing (classification, page numbers, legal footnote). One block, reused by every layout that needs it.',
    audience: ['Compliance', 'Print / production'],
    outcomes: [
      'Consistent classification and pagination across every printed page',
    ],
    scenarios: [
      {
        title: '“For Official Use Only” classification on internal reports',
        body: 'Create one header block; attach it to all internal-report layouts.',
      },
    ],
    risksIfSkipped: [
      'Missing page numbers or classification banners on regulated documents',
    ],
  }),

  'assets-disclaimers': bc({
    summary:
      'Disclaimers protect the organisation legally. Managed centrally, translated per language, and inherited or overridden per department.',
    audience: ['Legal', 'Compliance'],
    outcomes: [
      'Every external email and PDF carries the correct confidentiality / legal notice',
      'Legal can update the disclaimer once and roll it out globally',
    ],
    scenarios: [
      {
        title: 'New privacy legislation',
        body: 'Update the confidentiality disclaimer — every module’s next outbound email includes it automatically.',
      },
    ],
    risksIfSkipped: [
      'Missing confidentiality notices on personal-data emails → regulatory risk',
    ],
  }),

  'assets-portal-branding': bc({
    summary:
      'Portal branding shapes the first impression of external users — employers, insured persons, doctors. Consistent with the internal brand and controlled without a code release.',
    audience: ['Digital / UX team', 'Comms'],
    outcomes: [
      'Portals feel like part of the organisation, not a third-party tool',
      'Seasonal / campaign banners without engineering',
    ],
    scenarios: [
      {
        title: 'Annual filing campaign',
        body: 'Rotate the hero image and primary colour on the Employer Portal for the filing season.',
      },
    ],
    risksIfSkipped: [
      'Portals feel disconnected from the organisation → lower engagement and trust',
    ],
  }),

  'assets-document-assets': bc({
    summary:
      'Reusable document blocks (cover pages, appendices, T&Cs) authored once and embedded by many templates.',
    audience: ['Content / Comms', 'Legal for T&C sheets'],
    outcomes: [
      'Templates stay short and focused; boilerplate is centralised',
      'Update once, propagate everywhere',
    ],
    scenarios: [
      {
        title: 'Annual T&C update',
        body: 'Publish a new T&C document asset; every template that embeds it gets the update on next render.',
      },
    ],
    risksIfSkipped: [
      'Boilerplate duplicated inside dozens of templates → drift and stale legal text',
    ],
  }),

  'assets-categories': bc({
    summary:
      'A well-groomed taxonomy makes large brand catalogues browsable and enforceable.',
    audience: ['Brand / Comms'],
    outcomes: [
      'Faster asset selection in template editors',
      'Reports and audits by asset type',
    ],
    scenarios: [
      {
        title: 'Growing to 500+ media assets',
        body: 'Introduce a stable taxonomy early so pickers stay usable at scale.',
      },
    ],
    risksIfSkipped: [
      'Unbrowseable Media Library, wrong assets picked in templates',
    ],
  }),

  'library-templates': bc({
    summary:
      'Document templates are the printed / PDF voice of the organisation. Authored once with tokens; rendered per business event with the right brand, language and channel.',
    audience: [
      'Content designers and business analysts authoring correspondence',
      'Module owners who need the org to produce a new kind of letter',
    ],
    outcomes: [
      'Business modules never hard-code letter bodies',
      'Adding a new language or channel is content work, not code work',
    ],
    scenarios: [
      {
        title: 'New “Compliance Warning” letter',
        body: 'Author a template with the right layout, tokens and text blocks. Bind it in the Configuration Center to the COMPLIANCE_WARNING business event. Compliance can now issue warnings.',
      },
      {
        title: 'Adding a French variant of an existing letter',
        body: 'Add a language variant on the existing template — no changes anywhere else are required.',
      },
    ],
    risksIfSkipped: [
      'Modules ship without official correspondence, or ship with hard-coded prose',
    ],
  }),

  'library-notification-templates': bc({
    summary:
      'Short-form notifications (OTPs, workflow alerts, status changes) that reach users on the channels they actually watch.',
    audience: ['Workflow designers', 'CX / Notifications owner'],
    outcomes: [
      'Reliable, on-brand transactional notifications on Email / SMS / WhatsApp / In-App',
    ],
    scenarios: [
      {
        title: 'Filing acknowledgement SMS',
        body: 'Author an SMS notification template bound to the FILING_ACKNOWLEDGED event; every accepted filing triggers it.',
      },
    ],
    risksIfSkipped: [
      'Users are not informed, workflow stalls, support load rises',
    ],
  }),

  'library-text-blocks': bc({
    summary:
      'Reusable paragraphs (openings, closings, boilerplate, regulatory notices) authored once, referenced by many templates.',
    audience: ['Content designers', 'Legal for boilerplate'],
    outcomes: [
      'Update once, every letter re-resolves',
      'Consistent tone of voice across modules',
    ],
    scenarios: [
      {
        title: 'Standard closing paragraph changes',
        body: 'Update the text block once; every template that references it uses the new closing on next render.',
      },
    ],
    risksIfSkipped: [
      'Duplicated paragraphs drift over time; “find and replace” across dozens of templates',
    ],
  }),

  'library-tokens': bc({
    summary:
      'Tokens are the contract between the business data and the templates. Add a token → content designers can immediately merge that field into any letter.',
    audience: ['Module developers exposing data', 'Content designers'],
    outcomes: [
      'Content team is not blocked on engineering for new merge fields',
      'A stable, documented dictionary of every merge-field the platform supports',
    ],
    scenarios: [
      {
        title: 'Exposing case reference to Legal letters',
        body: 'Register {{case.reference}} once. All Legal templates can now use it — with sample values shown in preview.',
      },
    ],
    risksIfSkipped: [
      'Templates cannot merge business data; letters ship with blanks',
    ],
  }),

  'library-categories': bc({
    summary:
      'A cross-library taxonomy that keeps pickers usable as the catalogue grows.',
    audience: ['Content / Comms admins'],
    outcomes: ['Fast, discoverable pickers across templates, blocks and tokens'],
    scenarios: [
      {
        title: 'Compliance introduces 30 new notices',
        body: 'Group them under a “Compliance Notices” category so authors and admins find them instantly.',
      },
    ],
    risksIfSkipped: ['Unfindable content → duplication → drift'],
  }),

  'library-channels': bc({
    summary:
      'Channels are how the organisation reaches its users. Turning a channel on / off here is a business decision that immediately affects every module.',
    audience: ['Head of Digital / CX', 'CTO for provider changes'],
    outcomes: [
      'A single switch to enable WhatsApp / SMS / Email across the platform',
      'Provider changes without touching business modules',
    ],
    scenarios: [
      {
        title: 'Launching WhatsApp',
        body: 'Enable the WhatsApp channel, configure provider details. Any template with a WhatsApp variant becomes reachable via WhatsApp automatically.',
      },
    ],
    risksIfSkipped: [
      'Templates authored for a channel that is not configured → send failures',
    ],
  }),

  'library-languages': bc({
    summary:
      'The languages the organisation officially supports. Enabling a language unlocks per-language template, letterhead and channel variants.',
    audience: ['Comms', 'Public affairs'],
    outcomes: [
      'Truly bilingual / multilingual official communication',
    ],
    scenarios: [
      {
        title: 'Adding Spanish for a new market',
        body: 'Enable Spanish, then commission Spanish variants of the top templates and letterheads. Roll out gradually.',
      },
    ],
    risksIfSkipped: [
      'Every non-default-language recipient receives fallback-language content',
    ],
  }),

  'configuration-center': bc({
    summary:
      'The Configuration Center is where all the ingredients above are wired together into real business behaviour: “when THIS event fires in THIS scope, use THIS template on THIS channel.”',
    audience: [
      'Business Process Owners',
      'Governance / change managers',
    ],
    outcomes: [
      'Every business event has a resolvable template, channel, retention policy and approval workflow',
      'Overrides at any scope (module / department / location / user) without code changes',
    ],
    scenarios: [
      {
        title: 'Legal issues warnings differently from Compliance',
        body: 'Assign a Legal-specific template to the WARNING event scoped to the LEGAL module. Compliance keeps its own assignment untouched.',
      },
      {
        title: 'One branch requires printed notices instead of email',
        body: 'Add a location-scoped channel assignment for that branch → its notices print automatically while the rest of the org keeps emailing.',
      },
    ],
    risksIfSkipped: [
      'Business modules cannot resolve a template / channel and refuse to send',
    ],
  }),

  'validation-health': bc({
    summary:
      'The Health Dashboard tells you — at a glance — whether the organisation is safe to go live and produce official communication.',
    audience: ['Release manager', 'System admin', 'Auditor'],
    outcomes: [
      'Go / no-go signal for every rollout',
      'A single URL to send to auditors demonstrating configuration completeness',
    ],
    scenarios: [
      {
        title: 'Weekly readiness review',
        body: 'Open the dashboard, resolve any WARN / ERROR rows before Friday deploy.',
      },
    ],
    risksIfSkipped: [
      'Silent go-live failures — modules discover missing settings only when a user hits Send',
    ],
  }),

  'validation-usage': bc({
    summary:
      'Usage Validation answers the question every admin fears before hitting Delete: “what will break if I deactivate this?”',
    audience: ['Admins', 'Change managers'],
    outcomes: ['Safe deactivation and rename of assets, tokens and templates'],
    scenarios: [
      {
        title: 'Retiring the old letterhead',
        body: 'Look up its usage — reassign every referencing template, then deactivate.',
      },
    ],
    risksIfSkipped: [
      'Silent breakage of live communication when an in-use asset is deactivated',
    ],
  }),

  'validation-impact': bc({
    summary:
      'Impact Analysis simulates a change before it goes live and prints the exact list of downstream effects. Attach the report to your change ticket.',
    audience: ['Change managers', 'Governance / audit'],
    outcomes: [
      'Documented, evidence-backed change management',
      'Fewer post-change incidents',
    ],
    scenarios: [
      {
        title: 'Replacing the default template for STATUTORY_NOTICE',
        body: 'Preview the impact — every module, every scope affected — before switching.',
      },
    ],
    risksIfSkipped: [
      'Unplanned outages on high-visibility communication',
    ],
  }),

  'validation-broken': bc({
    summary:
      'A live list of every dangling reference in the configuration. Empty list = clean config.',
    audience: ['Admins', 'Auditors'],
    outcomes: ['Zero dangling assignments and orphaned templates going into production'],
    scenarios: [
      {
        title: 'Post-migration sweep',
        body: 'After importing configuration from another environment, sweep this list to zero before enabling users.',
      },
    ],
    risksIfSkipped: [
      'Users trigger business events that fail at render time because a referenced resource is gone',
    ],
  }),

  'consumption-guide': bc({
    summary:
      'The single, mandated way for every business module to obtain its settings. Follow this contract and inheritance, overrides, previews and impact analysis all “just work”.',
    audience: [
      'Business module developers (Benefits, Legal, Compliance, Finance, …)',
      'Tech leads reviewing new module PRs',
    ],
    outcomes: [
      'Zero direct reads from underlying tables',
      'Every module benefits from central branding, workflow and governance without re-implementing it',
    ],
    scenarios: [
      {
        title: 'Wiring a new module to Organisation Management',
        body: 'Import from @/platform/business-settings, pass moduleCode + businessEvent context, use the readiness hook to gate UI.',
      },
    ],
    risksIfSkipped: [
      'Direct DB access creates hidden coupling; branding / workflow / retention silently drift per module',
    ],
  }),

  'business-event-registry': bc({
    summary:
      'The registry of business events every module can bind assignments to — the shared vocabulary between Organisation Management and business modules.',
    audience: ['Module developers', 'Business analysts'],
    outcomes: ['A single, documented event vocabulary shared across modules'],
    scenarios: [
      {
        title: 'Adding a new event',
        body: 'Register the event once; the Configuration Center immediately lets admins bind templates and workflows to it.',
      },
    ],
    risksIfSkipped: [
      'Modules invent parallel event names; assignments are unfindable',
    ],
  }),

  'glossary-troubleshooting': bc({
    summary:
      'A shared vocabulary and a first-line troubleshooting guide so admins, developers and auditors talk about the same things using the same words.',
    audience: ['Everyone touching Organisation Management'],
    outcomes: ['Faster onboarding of new admins and developers'],
    scenarios: [
      {
        title: 'First 90 days of a new admin',
        body: 'Read the glossary before touching production; use troubleshooting when a template does not resolve.',
      },
    ],
    risksIfSkipped: [
      'Confused conversations, misconfigured overrides, longer incident resolution',
    ],
  }),
};

/**
 * Render a BusinessCase into a Markdown string.
 * Kept as plain markdown so ManualPage (react-markdown) and the PDF / DOCX
 * exporters can share the same source.
 */
export function renderBusinessCaseMarkdown(bcase: BusinessCase | undefined): string {
  if (!bcase) return '';
  const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');
  const scenarios = bcase.scenarios
    .map((s) => `**${s.title}.** ${s.body}`)
    .map((line) => `- ${line}`)
    .join('\n');

  return `
## Business Case

${bcase.summary}

**Who benefits**
${bullets(bcase.audience)}

**Business outcomes**
${bullets(bcase.outcomes)}

**Real-world scenarios**
${scenarios}

**What happens if this is skipped**
${bullets(bcase.risksIfSkipped)}

---
`;
}

export function getBusinessCase(slug: string): BusinessCase | undefined {
  return BUSINESS_CASES[slug];
}
