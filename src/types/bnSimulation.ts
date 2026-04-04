// ============================================================
// BN Simulation Engine - Types & Contracts
// ============================================================
// Isolated type definitions for the simulation workspace.
// References existing engine types but never modifies them.
// ============================================================

import type {
  BnCalcEngineOutput,
  BnCalcTraceEntry,
  BnFormulaStep,
  BnTraceSeverity,
  BnEngineLayer,
} from '@/types/bnCalcEngine';

// --- Scenario ---

export type BnSimScenarioStatus = 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';

export type BnSimScenarioType = 'STANDARD' | 'EDGE_CASE' | 'REGRESSION' | 'COMPARATIVE';
export type BnSimSourceType = 'MANUAL' | 'REPLAY' | 'IMPORT';

export interface BnSimScenario {
  id: string;
  scenario_code: string | null;
  scenario_name: string;
  description: string | null;
  product_id: string | null;
  product_version_id: string | null;
  scheme_id: string | null;
  country_code: string;
  scenario_type: BnSimScenarioType;
  source_type: BnSimSourceType;
  input_payload: Record<string, unknown> | null;
  base_claim_ref: string | null;
  notes: string | null;
  status: BnSimScenarioStatus;
  tags: string[] | null;
  entered_by: string | null;
  entered_at: string;
  modified_by: string | null;
  modified_at: string;
}

// --- Config Snapshot ---

export type BnSimSnapshotType = 'ELIGIBILITY' | 'CALCULATION' | 'DOCUMENT' | 'INTERACTION' | 'FULL';

export interface BnSimConfigSnapshot {
  id: string;
  scenario_id: string;
  snapshot_type: BnSimSnapshotType;
  product_version_id: string | null;
  config_data: Record<string, unknown>;
  captured_at: string;
  captured_by: string | null;
}

// --- Run ---

export type BnSimRunMode = 'SIMULATION' | 'WHAT_IF' | 'COMPARISON';
export type BnSimRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface BnSimRun {
  id: string;
  scenario_id: string;
  run_number: number;
  run_mode: BnSimRunMode;
  run_status: BnSimRunStatus;
  config_snapshot_id: string | null;
  product_version_id: string | null;
  country_code: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  warnings: unknown[] | null;
  triggered_by: string | null;
  entered_at: string;
  modified_at: string;
}

// --- Run Input ---

export type BnSimInputType = 'STRING' | 'NUMBER' | 'DATE' | 'JSON';

export interface BnSimRunInput {
  id: string;
  sim_run_id: string;
  input_key: string;
  input_value: string | null;
  input_type: BnSimInputType;
  input_json: Record<string, unknown> | null;
  sort_order: number;
  entered_at: string;
}

// --- Run Output ---

export type BnSimOutputType = 'NUMBER' | 'TEXT' | 'BOOLEAN' | 'JSON';

export interface BnSimRunOutput {
  id: string;
  sim_run_id: string;
  output_key: string;
  output_value: string | null;
  output_numeric: number | null;
  output_json: Record<string, unknown> | null;
  output_type: BnSimOutputType;
  sort_order: number;
  entered_at: string;
}

// --- Rule Trace ---

export interface BnSimRuleTrace {
  id: string;
  sim_run_id: string;
  step_number: number;
  engine_layer: string;
  rule_code: string | null;
  rule_label: string | null;
  inputs: Record<string, unknown> | null;
  passed: boolean | null;
  message: string | null;
  severity: string | null;
  duration_ms: number | null;
  entered_at: string;
}

// --- Formula Trace ---

export interface BnSimFormulaTrace {
  id: string;
  sim_run_id: string;
  step_number: number;
  engine_layer: string;
  step_code: string;
  step_label: string;
  formula_expression: string | null;
  inputs: Record<string, unknown> | null;
  output_value: number | null;
  output_text: string | null;
  duration_ms: number | null;
  entered_at: string;
}

// --- Simulation Input Contract (what the UI sends) ---

export interface BnSimulationRequest {
  scenarioId: string;
  productId: string;
  productVersionId: string;
  countryCode: string;
  runMode?: BnSimRunMode;
  triggeredBy?: string;
  /** Synthetic inputs for the simulation */
  inputs: BnSimInputParam[];
}

export interface BnSimInputParam {
  key: string;        // e.g. 'ssn', 'claim_date', 'age', 'total_weeks'
  value: string;
  type?: BnSimInputType;
  json?: Record<string, unknown>;
}

// --- Simulation Output Contract (what the service returns) ---

export interface BnSimulationResult {
  runId: string;
  scenarioId: string;
  status: BnSimRunStatus;
  durationMs: number;
  /** The full engine output (reused from production engine) */
  engineOutput: BnCalcEngineOutput;
  /** Persisted config snapshot id */
  configSnapshotId: string;
}
