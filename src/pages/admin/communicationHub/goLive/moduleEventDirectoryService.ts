/**
 * CH-SIMPLE-P3F-UX.1 — Master-data directory service for the Go Live page.
 *
 * Reads modules and events from the authoritative
 * `communication_hub_module_event_registry` view. RLS on the underlying
 * tables enforces operator permission — the frontend never adds a
 * hardcoded list. The backend continues to authoritatively validate
 * every selection at send-decision, preview, dry-run and controlled-live
 * gates; this service is presentation-only.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DirectoryModule {
  moduleCode: string;
  moduleName: string | null;
  eventCount: number;
}

export interface DirectoryEvent {
  id: string;
  moduleCode: string;
  moduleName: string | null;
  eventCode: string;
  eventName: string | null;
  channel: string | null;
  recipientType: string | null;
  integrationStatus: string | null;
  templateStatus: string | null;
  mappingStatus: string | null;
  liveStatus: string | null;
  notes: string | null;
}

interface RawRow {
  id: string;
  module_code: string;
  module_name: string | null;
  event_code: string;
  event_name: string | null;
  channel: string | null;
  recipient_type: string | null;
  integration_status: string | null;
  template_status: string | null;
  mapping_status: string | null;
  live_status: string | null;
  notes: string | null;
}

let cache: { fetchedAt: number; rows: DirectoryEvent[] } | null = null;
const CACHE_MS = 60_000;

export async function fetchModuleEventDirectory(
  opts: { force?: boolean } = {},
): Promise<DirectoryEvent[]> {
  const now = Date.now();
  if (!opts.force && cache && now - cache.fetchedAt < CACHE_MS) {
    return cache.rows;
  }
  const { data, error } = await (supabase as any)
    .from("communication_hub_module_event_registry")
    .select(
      "id, module_code, module_name, event_code, event_name, channel, recipient_type, integration_status, template_status, mapping_status, live_status, notes",
    )
    .order("module_code")
    .order("event_code");
  if (error) throw error;
  const rows: DirectoryEvent[] = ((data ?? []) as RawRow[]).map((r) => ({
    id: r.id,
    moduleCode: r.module_code,
    moduleName: r.module_name,
    eventCode: r.event_code,
    eventName: r.event_name,
    channel: r.channel,
    recipientType: r.recipient_type,
    integrationStatus: r.integration_status,
    templateStatus: r.template_status,
    mappingStatus: r.mapping_status,
    liveStatus: r.live_status,
    notes: r.notes,
  }));
  cache = { fetchedAt: now, rows };
  return rows;
}

export function groupModules(events: DirectoryEvent[]): DirectoryModule[] {
  const map = new Map<string, DirectoryModule>();
  for (const e of events) {
    const existing = map.get(e.moduleCode);
    if (existing) {
      existing.eventCount++;
    } else {
      map.set(e.moduleCode, {
        moduleCode: e.moduleCode,
        moduleName: e.moduleName,
        eventCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (a.moduleName ?? a.moduleCode).localeCompare(b.moduleName ?? b.moduleCode),
  );
}

export function eventsForModule(
  events: DirectoryEvent[],
  moduleCode: string,
): DirectoryEvent[] {
  return events
    .filter((e) => e.moduleCode === moduleCode)
    .sort((a, b) =>
      (a.eventName ?? a.eventCode).localeCompare(b.eventName ?? b.eventCode),
    );
}

/** Normalise a raw code (URL param or session-restored value) against the
 *  authoritative directory. Returns null when the value is not registered
 *  or the operator is not authorised to see it. */
export function resolveModule(
  events: DirectoryEvent[],
  code: string | null | undefined,
): DirectoryModule | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  const match = events.find((e) => e.moduleCode.toUpperCase() === upper);
  if (!match) return null;
  return {
    moduleCode: match.moduleCode,
    moduleName: match.moduleName,
    eventCount: events.filter((e) => e.moduleCode === match.moduleCode).length,
  };
}

export function resolveEvent(
  events: DirectoryEvent[],
  moduleCode: string | null | undefined,
  eventCode: string | null | undefined,
): DirectoryEvent | null {
  if (!moduleCode || !eventCode) return null;
  const mUpper = moduleCode.trim().toUpperCase();
  const eUpper = eventCode.trim().toUpperCase();
  return (
    events.find(
      (e) =>
        e.moduleCode.toUpperCase() === mUpper &&
        e.eventCode.toUpperCase() === eUpper,
    ) ?? null
  );
}
