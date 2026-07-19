/**
 * BN Gap Modules — Contract Test Fixture Framework.
 *
 * Transport-agnostic scenario fixtures. The SAME fixture must pass against:
 *   - the current Supabase implementation, and
 *   - the future ASP.NET Core implementation.
 *
 * Each fixture declares the initial state, the command envelope to send,
 * and the expected result / events / audit / state transition. A fixture
 * runner (test) wires it to a concrete backend and asserts equivalence.
 *
 * See docs/modernisation/benefits-gap/CONTRACT_TEST_STRATEGY.md.
 */
import type { BnGapCommandEnvelope, BnGapModuleCode } from '@/types/bn/gap/commandEnvelope';
import type { BnGapCommandResult, BnGapCommandStatus } from '@/types/bn/gap/commandResult';

/** Snapshot of an entity BEFORE the command executes. */
export interface FixtureExistingEntity {
  readonly entityType: string;
  readonly entityId: string;
  readonly state: Readonly<Record<string, unknown>>;
  readonly rowVersion?: string;
}

/** Recorded audit expectation. */
export interface FixtureExpectedAudit {
  readonly outcome: BnGapCommandStatus;
  readonly reasonCodeMatches?: string;
  readonly beforeHasKeys?: readonly string[];
  readonly afterHasKeys?: readonly string[];
}

/** Recorded event / state transition expectation. */
export interface FixtureExpectedEvent {
  readonly eventCode: string;
  readonly fromStatus?: string;
  readonly toStatus: string;
}

/** Recorded error expectation (for denial / conflict / invalid tests). */
export interface FixtureExpectedError {
  readonly code: string;
  readonly field?: string;
}

/** The transport-independent contract fixture. */
export interface BnGapContractFixture<TPayload = unknown, TData = unknown> {
  readonly id: string;
  readonly title: string;
  readonly moduleCode: BnGapModuleCode;
  readonly category:
    | 'happy_path'
    | 'validation'
    | 'authorisation'
    | 'concurrency'
    | 'idempotency'
    | 'maker_checker'
    | 'state_transition'
    | 'calculation'
    | 'integration';
  readonly actor: {
    readonly userId: string;
    readonly userCode: string;
    readonly roles: readonly string[];
    readonly capabilities: readonly string[];
  };
  readonly existing: readonly FixtureExistingEntity[];
  readonly envelope: BnGapCommandEnvelope<TPayload>;
  readonly expected: {
    readonly status: BnGapCommandStatus;
    readonly errors?: readonly FixtureExpectedError[];
    readonly warningsInclude?: readonly string[];
    readonly events?: readonly FixtureExpectedEvent[];
    readonly audit?: FixtureExpectedAudit;
    readonly data?: Partial<TData>;
  };
}

/** Runner contract: something that can execute an envelope. */
export type ContractRunner = <TP, TD>(
  envelope: BnGapCommandEnvelope<TP>,
) => Promise<BnGapCommandResult<TD>>;

/** Utility: shallow-check the result against a fixture. Returns errors. */
export function reconcileFixture<TP, TD>(
  fx: BnGapContractFixture<TP, TD>,
  result: BnGapCommandResult<TD>,
): readonly string[] {
  const problems: string[] = [];
  if (result.status !== fx.expected.status) {
    problems.push(`status: expected ${fx.expected.status}, got ${result.status}`);
  }
  for (const e of fx.expected.errors ?? []) {
    const hit = [...result.businessErrors, ...result.validationErrors].some(
      (b) => b.code === e.code && (!e.field || b.field === e.field),
    );
    if (!hit) problems.push(`expected error ${e.code}${e.field ? `/${e.field}` : ''} not found`);
  }
  for (const w of fx.expected.warningsInclude ?? []) {
    if (!result.warnings.some((x) => x.code === w)) problems.push(`expected warning ${w}`);
  }
  return problems;
}

/** Collect all fixtures registered via `registerFixtures`. */
const REGISTRY: BnGapContractFixture[] = [];
export function registerFixtures(...fx: BnGapContractFixture[]): void {
  for (const f of fx) REGISTRY.push(f);
}
export function allFixtures(): readonly BnGapContractFixture[] {
  return REGISTRY;
}
export function fixturesByModule(mod: BnGapModuleCode): readonly BnGapContractFixture[] {
  return REGISTRY.filter((f) => f.moduleCode === mod);
}
export function fixturesByCategory(cat: BnGapContractFixture['category']): readonly BnGapContractFixture[] {
  return REGISTRY.filter((f) => f.category === cat);
}
