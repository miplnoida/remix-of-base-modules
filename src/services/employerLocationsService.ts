/**
 * Employer Locations Service
 *
 * Resolves the set of physical locations available for an employer
 * for use in audit-location selection during planning / check-in.
 * Sources:
 *   1. er_master HQ address (primary)
 *   2. er_master mailing address
 *   3. er_locations rows (branches / sites)
 *
 * Returns a unified list with a stable `value` key the UI can store
 * back to ce_inspections.location_source + location_id.
 */
import { supabase } from '@/integrations/supabase/client';

export type EmployerLocationKind = 'HQ' | 'MAILING' | 'BRANCH' | 'OTHER' | 'MANUAL';

export interface EmployerLocationOption {
  /** Stable client-side value used in <Select>. */
  value: string;
  kind: EmployerLocationKind;
  /** er_locations.location_id when kind === 'BRANCH', otherwise null. */
  locationId: number | null;
  label: string;
  address: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  activityType?: string | null;
  tradeName?: string | null;
  isPrimary: boolean;
}

const join = (...parts: Array<string | null | undefined>) =>
  parts.filter((p) => p && String(p).trim()).map((p) => String(p).trim()).join(', ');

export const employerLocationsService = {
  /**
   * Fetch all known locations for an employer regno/id.
   * Always returns at least an OTHER (free-text) option so the UI can capture
   * unusual cases such as off-site interviews.
   */
  async list(employerId: string): Promise<EmployerLocationOption[]> {
    const out: EmployerLocationOption[] = [];

    if (!employerId) {
      out.push({
        value: 'OTHER',
        kind: 'OTHER',
        locationId: null,
        label: 'Other / off-site (specify)',
        address: '',
        isPrimary: false,
      });
      return out;
    }

    // 1. HQ + mailing from er_master
    const { data: master } = await (supabase as any)
      .from('er_master')
      .select('regno, name, hq_addr1, hq_addr2, hq_city, hq_state, hq_country, maddr1, maddr2')
      .eq('id', employerId)
      .maybeSingle();

    const hqAddr = master ? join(master.hq_addr1, master.hq_addr2, master.hq_city, master.hq_state) : '';
    if (hqAddr) {
      out.push({
        value: 'HQ',
        kind: 'HQ',
        locationId: null,
        label: `Head Office — ${hqAddr}`,
        address: hqAddr,
        city: master.hq_city,
        state: master.hq_state,
        country: master.hq_country,
        isPrimary: true,
      });
    }

    const mailAddr = master ? join(master.maddr1, master.maddr2) : '';
    if (mailAddr && mailAddr !== hqAddr) {
      out.push({
        value: 'MAILING',
        kind: 'MAILING',
        locationId: null,
        label: `Mailing Address — ${mailAddr}`,
        address: mailAddr,
        isPrimary: false,
      });
    }

    // 2. Branches / sites from er_locations
    const regno = master?.regno ?? employerId;
    const { data: locs } = await (supabase as any)
      .from('er_locations')
      .select('location_id, trade_name, loc_addr1, loc_addr2, city, state, country, activity_type')
      .eq('regno', regno)
      .order('location_id', { ascending: true });

    (locs ?? []).forEach((row: any) => {
      const addr = join(row.loc_addr1, row.loc_addr2, row.city, row.state);
      if (!addr) return;
      out.push({
        value: `BRANCH:${row.location_id}`,
        kind: 'BRANCH',
        locationId: Number(row.location_id),
        label: `${row.trade_name || 'Branch'} — ${addr}`,
        address: addr,
        city: row.city,
        state: row.state,
        country: row.country,
        activityType: row.activity_type,
        tradeName: row.trade_name,
        isPrimary: false,
      });
    });

    // 3. Always allow free-text override
    out.push({
      value: 'OTHER',
      kind: 'OTHER',
      locationId: null,
      label: 'Other / off-site (specify)',
      address: '',
      isPrimary: false,
    });

    return out;
  },

  /**
   * Resolve the default option for a fresh audit:
   * HQ if available, otherwise the first branch, otherwise OTHER.
   */
  pickDefault(options: EmployerLocationOption[]): EmployerLocationOption {
    return (
      options.find((o) => o.kind === 'HQ') ??
      options.find((o) => o.kind === 'BRANCH') ??
      options[options.length - 1]
    );
  },
};
