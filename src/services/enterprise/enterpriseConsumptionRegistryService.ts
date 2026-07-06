/**
 * Enterprise Consumption Registry Service
 *
 * Ownership and consumption contract for every enterprise entity.
 * Additive; does not touch legacy tables. Deep-links only, no duplicate CRUD.
 *
 * See docs/enterprise/ENTERPRISE_CONSUMPTION_REGISTRY_ACCEPTANCE.md
 */
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

export type EntityType =
  | "ENTERPRISE_MASTER" | "SHARED_DOMAIN_ENTITY" | "POLICY" | "PROCESS"
  | "BUSINESS_MODULE_ENTITY" | "LEGACY_ENTITY" | "EXTERNAL_ENTITY";
export type OwnerLayer =
  | "REFERENCE_FRAMEWORK" | "ENTERPRISE_MASTER" | "SHARED_DOMAIN"
  | "POLICY" | "PROCESS" | "BUSINESS_MODULE" | "LEGACY" | "EXTERNAL";
export type EntityStatus = "ACTIVE" | "ADAPTER" | "LEGACY_READONLY" | "DEPRECATED" | "PLANNED";
export type DuplicateRisk = "LOW" | "MEDIUM" | "HIGH";
export type RelationshipType = "CONSUMES" | "OWNS" | "MAPS_TO" | "ADAPTS_TO" | "VALIDATES" | "BLOCKS" | "PRODUCES";
export type EnforcementLevel = "REQUIRED" | "RECOMMENDED" | "INFORMATIONAL";
export type ViolationType = "DUPLICATE_OWNER" | "DIRECT_TABLE_READ" | "HARDCODED_REFERENCE" | "LEGACY_BYPASS" | "UNMAPPED_LEGACY" | "UNKNOWN_OWNER";
export type Severity = "P0" | "P1" | "P2";
export type ViolationStatus = "OPEN" | "DEFERRED" | "RESOLVED";

export interface RegistryEntity {
  id: string;
  entity_key: string;
  entity_name: string;
  entity_type: EntityType;
  owner_layer: OwnerLayer;
  owner_domain: string | null;
  canonical_route: string | null;
  canonical_table: string | null;
  canonical_service: string | null;
  canonical_key_column: string | null;
  status: EntityStatus;
  duplicate_risk: DuplicateRisk;
  notes: string | null;
}

export interface RegistryEdge {
  id: string;
  source_entity_key: string;
  target_entity_key: string;
  relationship_type: RelationshipType;
  consumer_domain: string | null;
  consumer_route: string | null;
  consumer_service: string | null;
  enforcement_level: EnforcementLevel;
  status: "ACTIVE" | "PLANNED" | "LEGACY";
  notes: string | null;
}

export interface RegistryViolation {
  id: string;
  violation_key: string;
  entity_key: string | null;
  detected_in: string | null;
  violation_type: ViolationType;
  severity: Severity;
  message: string;
  recommendation: string | null;
  status: ViolationStatus;
  created_at: string;
  resolved_at: string | null;
}

export async function listEntities(): Promise<RegistryEntity[]> {
  const { data, error } = await db.from("enterprise_consumption_registry").select("*").order("owner_layer").order("entity_name");
  if (error) throw error;
  return (data ?? []) as RegistryEntity[];
}

export async function getEntity(entityKey: string): Promise<RegistryEntity | null> {
  const { data, error } = await db.from("enterprise_consumption_registry").select("*").eq("entity_key", entityKey).maybeSingle();
  if (error) throw error;
  return (data as RegistryEntity) ?? null;
}

export async function listEdges(): Promise<RegistryEdge[]> {
  const { data, error } = await db.from("enterprise_consumption_edge").select("*");
  if (error) throw error;
  return (data ?? []) as RegistryEdge[];
}

export async function listConsumers(entityKey: string): Promise<RegistryEdge[]> {
  const { data, error } = await db.from("enterprise_consumption_edge").select("*").eq("target_entity_key", entityKey);
  if (error) throw error;
  return (data ?? []) as RegistryEdge[];
}

export async function listDependencies(entityKey: string): Promise<RegistryEdge[]> {
  const { data, error } = await db.from("enterprise_consumption_edge").select("*").eq("source_entity_key", entityKey);
  if (error) throw error;
  return (data ?? []) as RegistryEdge[];
}

export async function listViolations(status?: ViolationStatus): Promise<RegistryViolation[]> {
  let q = db.from("enterprise_consumption_violation").select("*").order("severity").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as RegistryViolation[];
}

export async function registerEntity(e: Partial<RegistryEntity> & { entity_key: string; entity_name: string; entity_type: EntityType; owner_layer: OwnerLayer }): Promise<void> {
  const { error } = await db.from("enterprise_consumption_registry").upsert(e, { onConflict: "entity_key" });
  if (error) throw error;
}

export async function registerEdge(e: Omit<RegistryEdge, "id">): Promise<void> {
  const { error } = await db.from("enterprise_consumption_edge").upsert(e, { onConflict: "source_entity_key,target_entity_key,relationship_type" });
  if (error) throw error;
}

export async function markViolationResolved(violationKey: string): Promise<void> {
  const { error } = await db.from("enterprise_consumption_violation")
    .update({ status: "RESOLVED", resolved_at: new Date().toISOString() })
    .eq("violation_key", violationKey);
  if (error) throw error;
}

/**
 * Detects consumption violations against known signals.
 * Limitations: no static source scan is performed; scan-based checks are
 * documented in the acceptance doc and are best surfaced by CI, not runtime.
 */
export async function detectConsumptionViolations(): Promise<RegistryViolation[]> {
  const now = new Date().toISOString();
  const findings: Array<Omit<RegistryViolation, "id" | "created_at" | "resolved_at"> & { created_at?: string }> = [];

  // 1) Unmapped legacy finance masters (via finance_master_crosswalk)
  try {
    const [{ data: banks }, { data: methods }, { data: xwalk }] = await Promise.all([
      db.from("tb_bank_code").select("bank_code").limit(1000),
      db.from("tb_method_of_payment").select("code").limit(1000),
      db.from("finance_master_crosswalk").select("legacy_code, legacy_domain"),
    ]);
    const mappedBanks = new Set((xwalk ?? []).filter((x: any) => x.legacy_domain === "BANK").map((x: any) => x.legacy_code));
    const mappedMethods = new Set((xwalk ?? []).filter((x: any) => x.legacy_domain === "PAYMENT_METHOD").map((x: any) => x.legacy_code));
    const unmappedBanks = (banks ?? []).filter((b: any) => b.bank_code && !mappedBanks.has(b.bank_code));
    const unmappedMethods = (methods ?? []).filter((m: any) => m.code && !mappedMethods.has(m.code));
    if (unmappedBanks.length > 0) {
      findings.push({
        violation_key: `unmapped.tb_bank_code.count.${unmappedBanks.length}`,
        entity_key: "legacy.tb_bank_code",
        detected_in: "finance_master_crosswalk",
        violation_type: "UNMAPPED_LEGACY",
        severity: "P1",
        message: `${unmappedBanks.length} legacy tb_bank_code rows are not mapped to Financial Reference banks.`,
        recommendation: "Add crosswalk rows in finance_master_crosswalk or seed the missing banks in ssp_bank.",
        status: "OPEN",
      });
    }
    if (unmappedMethods.length > 0) {
      findings.push({
        violation_key: `unmapped.tb_method_of_payment.count.${unmappedMethods.length}`,
        entity_key: "legacy.tb_method_of_payment",
        detected_in: "finance_master_crosswalk",
        violation_type: "UNMAPPED_LEGACY",
        severity: "P1",
        message: `${unmappedMethods.length} legacy tb_method_of_payment rows are not mapped to Financial Reference payment channels.`,
        recommendation: "Add crosswalk rows in finance_master_crosswalk or seed the missing channels in ssp_payment_channel.",
        status: "OPEN",
      });
    }
  } catch {
    // Best-effort; missing tables should not fail readiness.
  }

  // 2) Entities without owner
  try {
    const { data: unknown } = await db.from("enterprise_consumption_registry").select("entity_key,entity_name").is("owner_layer", null);
    (unknown ?? []).forEach((r: any) =>
      findings.push({
        violation_key: `unknown-owner.${r.entity_key}`,
        entity_key: r.entity_key,
        detected_in: "enterprise_consumption_registry",
        violation_type: "UNKNOWN_OWNER",
        severity: "P1",
        message: `Entity ${r.entity_name} has no owner layer.`,
        recommendation: "Assign an owner layer via Enterprise Consumption Registry.",
        status: "OPEN",
      })
    );
  } catch { /* ignore */ }

  // 3) Duplicate canonical owners for same canonical_table
  try {
    const { data: all } = await db.from("enterprise_consumption_registry")
      .select("entity_key,entity_name,canonical_table,status")
      .eq("status", "ACTIVE")
      .not("canonical_table", "is", null);
    const byTable = new Map<string, any[]>();
    (all ?? []).forEach((r: any) => {
      if (!r.canonical_table) return;
      const arr = byTable.get(r.canonical_table) ?? [];
      arr.push(r);
      byTable.set(r.canonical_table, arr);
    });
    byTable.forEach((rows, table) => {
      if (rows.length > 1) {
        findings.push({
          violation_key: `duplicate-owner.${table}`,
          entity_key: rows[0].entity_key,
          detected_in: `canonical_table=${table}`,
          violation_type: "DUPLICATE_OWNER",
          severity: "P0",
          message: `Multiple active owners for canonical table ${table}: ${rows.map((r: any) => r.entity_key).join(", ")}.`,
          recommendation: "Consolidate to a single owner; mark others as ADAPTER or LEGACY_READONLY.",
          status: "OPEN",
        });
      }
    });
  } catch { /* ignore */ }

  // Persist findings idempotently by violation_key.
  if (findings.length > 0) {
    const rows = findings.map((f) => ({ ...f, created_at: now }));
    await db.from("enterprise_consumption_violation").upsert(rows, { onConflict: "violation_key" });
  }

  return listViolations("OPEN");
}

export async function getEntityOwnershipSummary(): Promise<Record<OwnerLayer, number>> {
  const entities = await listEntities();
  const summary: Record<string, number> = {};
  entities.forEach((e) => { summary[e.owner_layer] = (summary[e.owner_layer] ?? 0) + 1; });
  return summary as Record<OwnerLayer, number>;
}

export interface BnConsumptionReadiness {
  status: "READY" | "READY_WITH_WARNINGS" | "BLOCKED";
  ownedByBn: RegistryEntity[];
  platformOwnedRequired: RegistryEntity[];
  openP0: RegistryViolation[];
  reasons: string[];
}

export async function getBnConsumptionReadiness(): Promise<BnConsumptionReadiness> {
  const [entities, edges, violations] = await Promise.all([
    listEntities(),
    listEdges(),
    listViolations("OPEN"),
  ]);
  const bnOwned = entities.filter((e) => e.owner_layer === "BUSINESS_MODULE" && e.entity_key.startsWith("bn."));
  const bnEdges = edges.filter((x) => x.source_entity_key.startsWith("bn.") && x.relationship_type === "CONSUMES");
  const requiredTargets = new Set(bnEdges.filter((x) => x.enforcement_level === "REQUIRED").map((x) => x.target_entity_key));
  const platformRequired = entities.filter((e) => requiredTargets.has(e.entity_key));
  const openP0 = violations.filter((v) => v.severity === "P0");
  const reasons: string[] = [];
  if (openP0.length > 0) reasons.push(`${openP0.length} open P0 consumption violation(s).`);
  const status: BnConsumptionReadiness["status"] =
    openP0.length > 0 ? "BLOCKED" :
    violations.length > 0 ? "READY_WITH_WARNINGS" : "READY";
  return { status, ownedByBn: bnOwned, platformOwnedRequired: platformRequired, openP0, reasons };
}

export const enterpriseConsumptionRegistryService = {
  listEntities, getEntity, listEdges, listConsumers, listDependencies, listViolations,
  registerEntity, registerEdge, markViolationResolved, detectConsumptionViolations,
  getEntityOwnershipSummary, getBnConsumptionReadiness,
};
