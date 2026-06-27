/**
 * Reference Registry
 *
 * Declares, per communication-entity type, which database tables/columns
 * may reference an entity instance. Used by the reference scanner to
 * produce a "Where Used" list before allowing delete.
 *
 * Reference sources fall into one of two query shapes:
 *  - column:   table.column = entityId
 *  - json:     table.jsonbColumn @ jsonPath = entityId
 *
 * The scanner degrades gracefully if a table is absent in this project.
 */

export type CommEntityType =
  | "comm_letterhead"
  | "comm_media_asset"
  | "comm_email_signature"
  | "comm_disclaimer"
  | "comm_print_footer"
  | "core_text_block";

export type ReferenceGroup =
  | "Organization"
  | "Department"
  | "Module"
  | "Template"
  | "Notification"
  | "Generated Document"
  | "Report"
  | "DMS"
  | "Case / Matter"
  | "Mapping";

export interface ReferenceSource {
  /** Source DB table */
  table: string;
  /** Human group label for the WhereUsed panel */
  group: ReferenceGroup;
  /** Short label per row, e.g. "Organization profile" */
  label: string;
  /** Match strategy */
  match:
    | { kind: "column"; column: string }
    | { kind: "jsonContains"; column: string; pathValue: (id: string) => Record<string, any> }
    | { kind: "jsonEquals"; column: string; jsonPath: string[] };
  /** Optional id+label columns to show in the WhereUsed list */
  idColumn?: string;
  labelColumn?: string;
  /** Build a deep link to the referencing record */
  routeBuilder?: (row: any) => string | null;
  /** Whether this reference can be rewritten by the "Replace" workflow */
  replaceable?: boolean;
  /** For json refs, describe the writable path (dot notation) */
  writePath?: string;
}

const orgRoute = () => `/admin/organization/profile`;
const deptRoute = (r: any) => `/admin/organization/departments?dept=${r?.department_code ?? ""}`;
const templateRoute = (r: any) => `/admin/organization/letterheads?id=${r?.id ?? ""}`;
const notifRoute = (r: any) => `/admin/notifications/templates?id=${r?.id ?? ""}`;
const genDocRoute = (r: any) => `/admin/documents/generated?id=${r?.id ?? ""}`;

const ASSET_REFS: ReferenceSource[] = [
  // Organization profile
  {
    table: "core_organization",
    group: "Organization",
    label: "Organization default logo",
    match: { kind: "column", column: "logo_asset_id" },
    idColumn: "id",
    labelColumn: "name",
    routeBuilder: orgRoute,
    replaceable: true,
    writePath: "logo_asset_id",
  },
  {
    table: "core_organization",
    group: "Organization",
    label: "Organization secondary logo",
    match: { kind: "column", column: "secondary_logo_asset_id" },
    idColumn: "id",
    labelColumn: "name",
    routeBuilder: orgRoute,
    replaceable: true,
    writePath: "secondary_logo_asset_id",
  },
  // Department profile
  {
    table: "core_department_profile",
    group: "Department",
    label: "Department override logo",
    match: { kind: "column", column: "override_logo_asset_id" },
    idColumn: "id",
    labelColumn: "department_name",
    routeBuilder: deptRoute,
    replaceable: true,
    writePath: "override_logo_asset_id",
  },
  {
    table: "core_department_profile",
    group: "Department",
    label: "Department override seal",
    match: { kind: "column", column: "override_seal_asset_id" },
    idColumn: "id",
    labelColumn: "department_name",
    routeBuilder: deptRoute,
    replaceable: true,
    writePath: "override_seal_asset_id",
  },
  // Asset mapping
  {
    table: "comm_asset_mapping",
    group: "Mapping",
    label: "Asset mapping rule",
    match: { kind: "column", column: "asset_id" },
    idColumn: "id",
    labelColumn: "communication_type",
    replaceable: true,
    writePath: "asset_id",
  },
  // Letterhead design_config references (logo / seal / watermark / qr)
  {
    table: "comm_letterhead",
    group: "Template",
    label: "Template — branding.logo_asset_id",
    match: { kind: "jsonContains", column: "design_config", pathValue: (id) => ({ branding: { logo_asset_id: id } }) },
    idColumn: "id",
    labelColumn: "name",
    routeBuilder: templateRoute,
    replaceable: true,
    writePath: "design_config.branding.logo_asset_id",
  },
  {
    table: "comm_letterhead",
    group: "Template",
    label: "Template — header.seal_asset_id",
    match: { kind: "jsonContains", column: "design_config", pathValue: (id) => ({ header: { seal_asset_id: id } }) },
    idColumn: "id",
    labelColumn: "name",
    routeBuilder: templateRoute,
    replaceable: true,
    writePath: "design_config.header.seal_asset_id",
  },
  {
    table: "comm_letterhead",
    group: "Template",
    label: "Template — branding.watermark_asset_id",
    match: { kind: "jsonContains", column: "design_config", pathValue: (id) => ({ branding: { watermark_asset_id: id } }) },
    idColumn: "id",
    labelColumn: "name",
    routeBuilder: templateRoute,
    replaceable: true,
    writePath: "design_config.branding.watermark_asset_id",
  },
  {
    table: "comm_letterhead",
    group: "Template",
    label: "Template — footer.qr_asset_id",
    match: { kind: "jsonContains", column: "design_config", pathValue: (id) => ({ footer: { qr_asset_id: id } }) },
    idColumn: "id",
    labelColumn: "name",
    routeBuilder: templateRoute,
    replaceable: true,
    writePath: "design_config.footer.qr_asset_id",
  },
  // Generated documents (historical — blocks delete)
  {
    table: "core_generated_document",
    group: "Generated Document",
    label: "Generated document — asset used",
    match: { kind: "jsonContains", column: "metadata", pathValue: (id) => ({ asset_ids: [id] }) },
    idColumn: "id",
    labelColumn: "document_number",
    routeBuilder: genDocRoute,
    replaceable: false,
  },
];

const LETTERHEAD_REFS: ReferenceSource[] = [
  {
    table: "core_organization",
    group: "Organization",
    label: "Organization default template",
    match: { kind: "column", column: "default_letterhead_id" },
    idColumn: "id",
    labelColumn: "name",
    routeBuilder: orgRoute,
    replaceable: true,
    writePath: "default_letterhead_id",
  },
  {
    table: "core_department_profile",
    group: "Department",
    label: "Department default template",
    match: { kind: "column", column: "default_letterhead_id" },
    idColumn: "id",
    labelColumn: "department_name",
    routeBuilder: deptRoute,
    replaceable: true,
    writePath: "default_letterhead_id",
  },
  {
    table: "core_generated_document",
    group: "Generated Document",
    label: "Generated document — produced from template",
    match: { kind: "column", column: "letterhead_id" },
    idColumn: "id",
    labelColumn: "document_number",
    routeBuilder: genDocRoute,
    replaceable: false,
  },
];

const EMAIL_SIG_REFS: ReferenceSource[] = [
  {
    table: "core_department_profile",
    group: "Department",
    label: "Department default email signature",
    match: { kind: "column", column: "default_email_signature_id" },
    idColumn: "id",
    labelColumn: "department_name",
    routeBuilder: deptRoute,
    replaceable: true,
    writePath: "default_email_signature_id",
  },
];

const DISCLAIMER_REFS: ReferenceSource[] = [
  {
    table: "core_department_profile",
    group: "Department",
    label: "Department default disclaimer",
    match: { kind: "column", column: "default_disclaimer_id" },
    idColumn: "id",
    labelColumn: "department_name",
    routeBuilder: deptRoute,
    replaceable: true,
    writePath: "default_disclaimer_id",
  },
];

const PRINT_FOOTER_REFS: ReferenceSource[] = [
  {
    table: "core_department_profile",
    group: "Department",
    label: "Department default print footer",
    match: { kind: "column", column: "default_print_footer_id" },
    idColumn: "id",
    labelColumn: "department_name",
    routeBuilder: deptRoute,
    replaceable: true,
    writePath: "default_print_footer_id",
  },
];

const TEXT_BLOCK_REFS: ReferenceSource[] = [
  // Templates referencing the block by code in design_config.content.blocks[]
  {
    table: "comm_letterhead",
    group: "Template",
    label: "Template — content.blocks[]",
    match: { kind: "jsonContains", column: "design_config", pathValue: (code) => ({ content: { blocks: [code] } }) },
    idColumn: "id",
    labelColumn: "name",
    routeBuilder: templateRoute,
    replaceable: false,
  },
];

export const REFERENCE_REGISTRY: Record<CommEntityType, ReferenceSource[]> = {
  comm_media_asset: ASSET_REFS,
  comm_letterhead: LETTERHEAD_REFS,
  comm_email_signature: EMAIL_SIG_REFS,
  comm_disclaimer: DISCLAIMER_REFS,
  comm_print_footer: PRINT_FOOTER_REFS,
  core_text_block: TEXT_BLOCK_REFS,
};

export const ENTITY_LABEL: Record<CommEntityType, string> = {
  comm_media_asset: "Communication Asset",
  comm_letterhead: "Official Template",
  comm_email_signature: "Email Signature",
  comm_disclaimer: "Disclaimer",
  comm_print_footer: "Print Footer",
  core_text_block: "Text Block",
};

/** For Text Blocks the "id" matched in references is the text_block_code, not the row id. */
export const ENTITY_MATCH_KEY: Record<CommEntityType, "id" | "text_block_code"> = {
  comm_media_asset: "id",
  comm_letterhead: "id",
  comm_email_signature: "id",
  comm_disclaimer: "id",
  comm_print_footer: "id",
  core_text_block: "text_block_code",
};
