# Enterprise Configuration Asset Framework (Platform v1.0)

Status: Approved for Wave 1 — Epic A (framework + one reference asset).
Scope: Platform-wide. NOT SSB-only. NOT Benefits-only.

## 1. What is a Configuration Asset?

A Configuration Asset is **any configurable enterprise object** that can:

- have versions
- have a lifecycle (draft → validated → scheduled → active → retired)
- have consumers (modules, processes, reports)
- have dependencies (other assets it consumes)
- have validation (blocking / warning / info findings)
- have approvals (maker–checker)
- have effective dates
- have audit history
- contribute to Platform Readiness

Examples that MUST plug in:

- SSB Address / Identity / Numbering / Contribution Calendar / Financial /
  Legal / Documents / Communication / Workflow Policies
- Workflow Definitions
- Notification Templates
- Number Sequences
- Banks, Payment Channels, Settlement Methods (shared finance domain)
- Document Profiles
- Benefit Type, Contribution Rate, Formula, Eligibility Rule (future BN)

## 2. Non-goals

- Not a new administration module.
- Not a duplicate of Governance, Platform Readiness or the Enterprise
  Consumption Registry.
- Does not create new routes. Existing URLs continue to work.
- Does not change legacy BN/BEMA/IA/`ip_*`/`er_*`/`cl_*`/`cn_*` tables.

## 3. Architecture (unchanged)

```
Reference Framework
   ↓
Enterprise Masters
   ↓
Shared Domains
   ↓
Policies
   ↓
Business Processes
   ↓
Business Modules
```

Only the **presentation, validation, versioning, approval, audit and
consumption surface** for configuration assets becomes standardised.

## 4. The framework has three parts

### 4.1 Asset Descriptor (data)

```ts
interface ConfigurationAssetDescriptor {
  assetKey: string;              // e.g. "ssb.financial"
  assetName: string;             // "Financial / Payment Policy"
  assetType: string;             // "POLICY" | "TEMPLATE" | "MASTER" | ...
  ownerDomain: string;
  canonicalRoute: string;
  canonicalTable: string | null; // for validation & impact
  registryEntityKey?: string;    // enterprise consumption registry mapping
  supportsLifecycle: boolean;
  supportsVersions: boolean;
}
```

### 4.2 Asset Interface (behaviour)

```ts
interface ConfigurationAssetContract {
  getConfiguration(): ReactNode;   // author surface (existing form)
  getValidation(): Promise<ValidationReport>;
  getDependencies(): Promise<AssetEdge[]>;
  getConsumers(): Promise<AssetEdge[]>;
  getHistory(): Promise<VersionEntry[]>;
  getLifecycle(): Promise<LifecycleState>;
  getReadiness(): Promise<ReadinessSummary>;
  getAudit(): Promise<AuditEntry[]>;
}
```

Every method delegates to an **existing service** — never re-implemented:

| Behaviour | Delegated to |
|---|---|
| Validation | `ssbConfigurationGovernanceService.listValidationResults` |
| Lifecycle | `ssbPolicyLifecycleService` |
| Dependencies / Consumers | `enterpriseConsumptionRegistryService` + `ssbConfigurationGovernanceService.listDependencies/listConsumers` |
| Readiness | `platformReadinessService` (asset-scoped view) |
| History / Audit | `ssb_policy_audit` + `ssb_configuration_snapshot` |

### 4.3 Asset Shell (UI)

`EnterpriseConfigurationAssetShell` — one reusable React component:

- Asset Header (name, type, owner, status, version, effective window)
- Status Banner (Draft / Pending / Current / Future / Retired / Blocked / Ready)
- Tabs: **Configuration · Dependencies · Consumers · Validation · History · Impact**
- Actions: Save Draft / Validate / Approve / Activate / Retire / Refresh
  Readiness (all delegated to existing services)
- Validation summary (blocking / warnings / info)
- Readiness summary (processes / modules / consumers affected)

## 5. Phased rollout

- **Epic A (this epic)** — Build framework, ship one reference asset
  (Financial Policy).
- **Epic B (next)** — Migrate Address, Identity, Numbering, Contribution
  Calendar, Legal, Documents, Communication, Workflow to the same shell.
- **Epic C (Benefits Wave 1)** — Benefit Type, Contribution Rate, Formula,
  Eligibility Rule plug in for free.

## 6. Rules

- **No duplicate CRUD.** The shell wraps existing forms; it does not
  re-implement them.
- **No duplicate validation.** All validation comes from
  `ssbConfigurationGovernanceService`.
- **No duplicate lifecycle.** All state transitions go through
  `ssbPolicyLifecycleService`.
- **No new routes.** The shell renders inside existing routes.
- **No legacy table changes.**
