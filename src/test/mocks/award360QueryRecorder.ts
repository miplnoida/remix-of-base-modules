/**
 * AW360-WAVE-1-C1 Slice B — table-aware Supabase mock and recorder.
 *
 * The recorder validates every `.select` / `.eq` / `.order` / `.contains`
 * against `AWARD360_SCHEMA_CONTRACT`. Any query issued by an Award 360
 * loader that references an unknown table, unknown column, `select('*')`,
 * or unparseable select string throws with a clear diagnostic — this is
 * how schema drift becomes a test failure instead of a runtime 500.
 */
import {
  AWARD360_SCHEMA_CONTRACT,
  type Award360TableName,
  type Award360TableContract,
} from '@/services/bn/awards/award360SchemaContract';

export interface RecordedAwardQuery {
  table: string;
  selectedColumns: string[];
  filters: Array<{ method: string; column: string; value?: unknown }>;
  orderColumns: string[];
  containmentColumns: string[];
  range?: [number, number];
  head: boolean;
  countMode?: string;
}

export interface AwardQueryRecorderOptions {
  /** Response payloads keyed by table name. */
  responses?: Record<string, unknown>;
  /** When true, unknown tables record but do not throw. Default false. */
  allowUnknownTables?: boolean;
}

function isKnownTable(t: string): t is Award360TableName {
  return t in AWARD360_SCHEMA_CONTRACT;
}

function contractFor(t: string): Award360TableContract | null {
  return isKnownTable(t) ? AWARD360_SCHEMA_CONTRACT[t] : null;
}

function parseSelect(table: string, raw: string): string[] {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '*') {
    throw new Error(`[${table}] select('*') is forbidden in Award 360 — pass explicit columns.`);
  }
  if (/[()]/.test(trimmed)) {
    throw new Error(`[${table}] Unparseable select — nested relationship syntax is not supported by the Award 360 schema contract. Original: ${JSON.stringify(raw)}`);
  }
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function assertColumn(table: string, column: string, op: string) {
  const contract = contractFor(table);
  if (!contract) throw new Error(`[${table}] ${op} against unknown table (not in Award 360 schema contract).`);
  if (!contract.allowedColumns.includes(column)) {
    throw new Error(
      `[${table}] ${op} references unknown column "${column}". Allowed: ${contract.allowedColumns.join(', ')}`,
    );
  }
}

export class AwardQueryRecorder {
  readonly queries: RecordedAwardQuery[] = [];
  constructor(private readonly opts: AwardQueryRecorderOptions = {}) {}

  reset() {
    this.queries.length = 0;
  }

  client() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const recorder = this;
    return {
      from(table: string) {
        if (!isKnownTable(table) && !recorder.opts.allowUnknownTables) {
          throw new Error(`[${table}] table is not registered in AWARD360_SCHEMA_CONTRACT.`);
        }
        const record: RecordedAwardQuery = {
          table,
          selectedColumns: [],
          filters: [],
          orderColumns: [],
          containmentColumns: [],
          head: false,
        };
        recorder.queries.push(record);

        const respond = () => {
          const raw = recorder.opts.responses?.[table] ?? [];
          const data = Array.isArray(raw) ? raw : raw ? [raw] : [];
          const count = data.length;
          return Promise.resolve({ data, error: null, count });
        };
        const respondSingle = () => {
          const raw = recorder.opts.responses?.[table] ?? null;
          const data = Array.isArray(raw) ? raw[0] ?? null : raw;
          return Promise.resolve({ data, error: null });
        };

        const builder: any = {
          select(cols?: string, opts?: { count?: string; head?: boolean }) {
            if (cols !== undefined) {
              record.selectedColumns = parseSelect(table, cols);
              record.selectedColumns.forEach((c) => assertColumn(table, c, 'select'));
            }
            if (opts?.head) record.head = true;
            if (opts?.count) record.countMode = opts.count;
            return builder;
          },
          eq(col: string, val: unknown) { assertColumn(table, col, 'eq'); record.filters.push({ method: 'eq', column: col, value: val }); return builder; },
          neq(col: string, val: unknown) { assertColumn(table, col, 'neq'); record.filters.push({ method: 'neq', column: col, value: val }); return builder; },
          in(col: string, val: unknown) { assertColumn(table, col, 'in'); record.filters.push({ method: 'in', column: col, value: val }); return builder; },
          is(col: string, val: unknown) { assertColumn(table, col, 'is'); record.filters.push({ method: 'is', column: col, value: val }); return builder; },
          not(col: string, _o: string, val: unknown) { assertColumn(table, col, 'not'); record.filters.push({ method: 'not', column: col, value: val }); return builder; },
          lt(col: string, val: unknown) { assertColumn(table, col, 'lt'); record.filters.push({ method: 'lt', column: col, value: val }); return builder; },
          lte(col: string, val: unknown) { assertColumn(table, col, 'lte'); record.filters.push({ method: 'lte', column: col, value: val }); return builder; },
          gt(col: string, val: unknown) { assertColumn(table, col, 'gt'); record.filters.push({ method: 'gt', column: col, value: val }); return builder; },
          gte(col: string, val: unknown) { assertColumn(table, col, 'gte'); record.filters.push({ method: 'gte', column: col, value: val }); return builder; },
          contains(col: string, val: unknown) {
            const contract = contractFor(table);
            const allowed = contract?.allowedContainmentColumns ?? [];
            if (!contract || !contract.allowedColumns.includes(col)) {
              throw new Error(`[${table}] contains references unknown column "${col}".`);
            }
            if (allowed.length > 0 && !allowed.includes(col)) {
              throw new Error(`[${table}] contains("${col}") is not an allowed containment column (allowed: ${allowed.join(', ')}).`);
            }
            record.containmentColumns.push(col);
            return builder;
          },
          order(col: string, _o?: unknown) {
            const contract = contractFor(table);
            if (!contract || !contract.allowedColumns.includes(col)) {
              throw new Error(`[${table}] order references unknown column "${col}".`);
            }
            if (contract.allowedOrderColumns && !contract.allowedOrderColumns.includes(col)) {
              throw new Error(`[${table}] order("${col}") is not an allowed order column (allowed: ${contract.allowedOrderColumns.join(', ')}).`);
            }
            record.orderColumns.push(col);
            return builder;
          },
          range(from: number, to: number) { record.range = [from, to]; return builder; },
          limit(_n: number) { return builder; },
          maybeSingle: () => respondSingle(),
          single: () => respondSingle(),
          then: (onFulfilled: any) => respond().then(onFulfilled),
        };
        return builder;
      },
    };
  }
}
