// ============================================
// CRON UTILITIES — Human-friendly schedule helpers
// ============================================

export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  hour: number;       // 0–23
  minute: number;     // 0–59
  dayOfWeek: number;  // 0=Sun, 1=Mon … 6=Sat  (used for weekly)
  dayOfMonth: number; // 1–31 (used for monthly)
  timezone?: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ── Generate cron from friendly config ── */

export function buildCron(cfg: ScheduleConfig): string {
  const { frequency, minute, hour, dayOfWeek, dayOfMonth } = cfg;
  switch (frequency) {
    case 'hourly':  return `${minute} * * * *`;
    case 'daily':   return `${minute} ${hour} * * *`;
    case 'weekly':  return `${minute} ${hour} * * ${dayOfWeek}`;
    case 'monthly': return `${minute} ${hour} ${dayOfMonth} * *`;
    default:        return '';
  }
}

/* ── Parse cron into friendly config ── */

export function parseCronToConfig(cron: string | null | undefined): ScheduleConfig | null {
  if (!cron) return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [min, hr, dom, , dow] = parts;

  const minute = parseInt(min) || 0;
  const hour = parseInt(hr) || 0;

  // Hourly: min is fixed, hr is *
  if (hr === '*' && dom === '*' && dow === '*') {
    return { frequency: 'hourly', minute, hour: 0, dayOfWeek: 1, dayOfMonth: 1 };
  }
  // Daily: hr fixed, dom *, dow *
  if (dom === '*' && dow === '*') {
    return { frequency: 'daily', minute, hour, dayOfWeek: 1, dayOfMonth: 1 };
  }
  // Weekly: dom *, dow fixed
  if (dom === '*' && dow !== '*') {
    return { frequency: 'weekly', minute, hour, dayOfWeek: parseInt(dow) || 0, dayOfMonth: 1 };
  }
  // Monthly: dom fixed, dow *
  if (dom !== '*' && dow === '*') {
    return { frequency: 'monthly', minute, hour, dayOfWeek: 1, dayOfMonth: parseInt(dom) || 1 };
  }
  return null; // complex / custom
}

/* ── Human-readable description ── */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function cronToHumanText(cron: string | null | undefined): string {
  if (!cron) return 'Manual only';
  const cfg = parseCronToConfig(cron);
  if (!cfg) return `Custom: ${cron}`;
  const time = `${pad2(cfg.hour)}:${pad2(cfg.minute)}`;
  switch (cfg.frequency) {
    case 'hourly':  return `Every hour at :${pad2(cfg.minute)}`;
    case 'daily':   return `Daily at ${time}`;
    case 'weekly':  return `Weekly on ${DAY_NAMES[cfg.dayOfWeek]} at ${time}`;
    case 'monthly': return `Monthly on the ${ordinal(cfg.dayOfMonth)} at ${time}`;
    default:        return `Custom: ${cron}`;
  }
}

/* ── Next N run times (naive, UTC-based) ── */

export function getNextRuns(cron: string | null | undefined, count = 3): Date[] {
  if (!cron) return [];
  const cfg = parseCronToConfig(cron);
  if (!cfg) return [];

  const runs: Date[] = [];
  const now = new Date();
  let cursor = new Date(now);
  cursor.setSeconds(0, 0);

  // Simple brute-force advance (max 400 iterations)
  for (let i = 0; i < 400 && runs.length < count; i++) {
    cursor = new Date(cursor.getTime() + 60 * 60 * 1000); // advance 1 hour

    switch (cfg.frequency) {
      case 'hourly':
        if (cursor.getMinutes() === cfg.minute) runs.push(new Date(cursor));
        break;
      case 'daily':
        if (cursor.getHours() === cfg.hour && cursor.getMinutes() === cfg.minute) runs.push(new Date(cursor));
        break;
      case 'weekly':
        if (cursor.getDay() === cfg.dayOfWeek && cursor.getHours() === cfg.hour && cursor.getMinutes() === cfg.minute)
          runs.push(new Date(cursor));
        break;
      case 'monthly':
        if (cursor.getDate() === cfg.dayOfMonth && cursor.getHours() === cfg.hour && cursor.getMinutes() === cfg.minute)
          runs.push(new Date(cursor));
        break;
    }
  }
  return runs;
}

/* ── Validate cron string ── */

export function isValidCron(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  return parts.length === 5 || parts.length === 6;
}

/* ── Schedule-vs-dependency conflict detection ── */

export interface ScheduleWarning {
  type: 'timing_conflict' | 'upstream_inactive' | 'upstream_no_runtime' | 'upstream_failed' | 'circular';
  message: string;
}

export function detectScheduleConflicts(
  jobCode: string,
  cron: string | null,
  dependsOn: string[],
  allJobs: Array<{ job_code: string; schedule_cron: string | null; is_enabled: boolean | null; last_run_status: string | null; parameters: Record<string, any> | null }>,
): ScheduleWarning[] {
  const warnings: ScheduleWarning[] = [];
  if (dependsOn.length === 0) return warnings;

  const myCfg = cron ? parseCronToConfig(cron) : null;

  for (const depCode of dependsOn) {
    const dep = allJobs.find(j => j.job_code === depCode);
    if (!dep) continue;

    const depParams = dep.parameters || {};

    // Upstream inactive
    if (!dep.is_enabled) {
      warnings.push({ type: 'upstream_inactive', message: `Upstream "${depCode}" is currently inactive` });
    }

    // Upstream no runtime
    if (!depParams.has_runtime) {
      warnings.push({ type: 'upstream_no_runtime', message: `Upstream "${depCode}" has no runtime handler` });
    }

    // Upstream last run failed
    if (dep.last_run_status === 'failed') {
      warnings.push({ type: 'upstream_failed', message: `Upstream "${depCode}" last run failed` });
    }

    // Timing conflict: this job runs before upstream
    if (myCfg && dep.schedule_cron) {
      const depCfg = parseCronToConfig(dep.schedule_cron);
      if (depCfg && myCfg.frequency === depCfg.frequency) {
        const myTime = myCfg.hour * 60 + myCfg.minute;
        const depTime = depCfg.hour * 60 + depCfg.minute;
        if (myTime <= depTime) {
          warnings.push({
            type: 'timing_conflict',
            message: `Runs at ${pad2(myCfg.hour)}:${pad2(myCfg.minute)} but upstream "${depCode}" runs at ${pad2(depCfg.hour)}:${pad2(depCfg.minute)}`
          });
        }
      }
    }
  }

  return warnings;
}

/* ── Circular dependency detection ── */

export function detectCircularDeps(
  jobCode: string,
  proposedDeps: string[],
  allJobs: Array<{ job_code: string; parameters: Record<string, any> | null }>,
): string[] | null {
  // BFS from each proposed dep to see if it eventually reaches jobCode
  for (const dep of proposedDeps) {
    const visited = new Set<string>();
    const queue = [dep];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === jobCode) return [jobCode, ...proposedDeps.filter(d => d === dep)];
      if (visited.has(current)) continue;
      visited.add(current);
      const j = allJobs.find(x => x.job_code === current);
      const deps = (j?.parameters?.depends_on || []) as string[];
      queue.push(...deps);
    }
  }
  return null;
}
