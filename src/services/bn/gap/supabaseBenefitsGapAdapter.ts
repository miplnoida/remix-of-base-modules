/**
 * BN Gap Modules — Supabase adapter for the portable API client.
 *
 * This is the ONLY place in the gap-modules stack allowed to know that the
 * current backend is Supabase. Everything else consumes `BenefitsGapApiClient`.
 *
 * When we migrate to ASP.NET Core + SQL Server, we ship a
 * `DotNetBenefitsGapAdapter` that implements the same interface against the
 * OpenAPI contract in `docs/bn/contracts/benefits-gap-api.openapi.yaml`, and
 * flip the DI in `index.ts`. No React screen changes.
 */
import { supabase } from '@/integrations/supabase/client';
import { BN_GAP_MODULE_CODES } from '@/types/bn/gap/moduleCodes';
import type {
  BnGapCommandEnvelope,
  BnGapModuleCode,
} from '@/types/bn/gap/commandEnvelope';
import type { BnGapCommandResult } from '@/types/bn/gap/commandResult';
import type {
  BenefitsGapApiClient,
  BnGapListQuery,
  BnGapListResult,
  BnGapModuleRolloutState,
} from './benefitsGapApiClient';

const COMMAND_FUNCTION = 'bn-gap-command';
const db = supabase as any;

export class SupabaseBenefitsGapAdapter implements BenefitsGapApiClient {
  async executeCommand<TPayload, TData>(
    envelope: BnGapCommandEnvelope<TPayload>,
  ): Promise<BnGapCommandResult<TData>> {
    const { data, error } = await supabase.functions.invoke(COMMAND_FUNCTION, {
      body: envelope,
    });
    if (error) {
      // Transport-level failure — surface as FAILED without leaking internals.
      return {
        success: false,
        commandId: crypto.randomUUID(),
        correlationId: envelope.correlationId,
        entityId: envelope.entityId,
        entityVersion: null,
        status: 'FAILED',
        warnings: [],
        validationErrors: [],
        businessErrors: [
          { code: 'TRANSPORT_FAILURE', message: 'The command service is unreachable.' },
        ],
        auditEventId: null,
        data: null,
      };
    }
    return data as BnGapCommandResult<TData>;
  }

  async getEntity<T>(
    _moduleCode: BnGapModuleCode,
    entityType: string,
    entityId: string,
  ): Promise<T | null> {
    // Read side of the boundary: reads flow through Supabase REST today.
    const { data, error } = await db.from(entityType).select('*').eq('id', entityId).maybeSingle();
    if (error) throw error;
    return (data as T) ?? null;
  }

  async list<T>(query: BnGapListQuery): Promise<BnGapListResult<T>> {
    let q = db.from(query.entityType).select('*', { count: 'exact' });
    for (const [k, v] of Object.entries(query.filters ?? {})) {
      q = v === null ? q.is(k, null) : q.eq(k, v);
    }
    if (query.orderBy) q = q.order(query.orderBy, { ascending: query.orderDir !== 'desc' });
    const pageSize = Math.max(1, Math.min(query.pageSize ?? 50, 500));
    const offset = query.pageToken ? Number.parseInt(query.pageToken, 10) || 0 : 0;
    q = q.range(offset, offset + pageSize - 1);
    const { data, error, count } = await q;
    if (error) throw error;
    const rows = (data ?? []) as T[];
    const nextOffset = offset + rows.length;
    return {
      items: rows,
      nextPageToken: rows.length === pageSize ? String(nextOffset) : null,
      totalCount: typeof count === 'number' ? count : null,
    };
  }

  async getModuleRolloutState(
    moduleCode: BnGapModuleCode,
  ): Promise<BnGapModuleRolloutState> {
    const { data, error } = await db
      .from('app_modules')
      .select('name,is_enabled,routes_enabled,actions_enabled,show_in_menu,rollout_state,release_version')
      .eq('name', moduleCode)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        moduleCode,
        exists: false,
        isEnabled: false,
        routesEnabled: false,
        actionsEnabled: false,
        showInMenu: false,
        rolloutState: 'unregistered',
        releaseVersion: null,
      };
    }
    return {
      moduleCode,
      exists: true,
      isEnabled: !!data.is_enabled,
      routesEnabled: !!data.routes_enabled,
      actionsEnabled: !!data.actions_enabled,
      showInMenu: !!data.show_in_menu,
      rolloutState: data.rollout_state ?? 'unknown',
      releaseVersion: data.release_version ?? null,
    };
  }

  async getAllModuleRolloutStates(): Promise<readonly BnGapModuleRolloutState[]> {
    const { data, error } = await db
      .from('app_modules')
      .select('name,is_enabled,routes_enabled,actions_enabled,show_in_menu,rollout_state,release_version')
      .in('name', BN_GAP_MODULE_CODES as unknown as string[]);
    if (error) throw error;
    const byName = new Map<string, any>((data ?? []).map((r: any) => [r.name, r]));
    return BN_GAP_MODULE_CODES.map((code) => {
      const r = byName.get(code);
      if (!r) {
        return {
          moduleCode: code,
          exists: false,
          isEnabled: false,
          routesEnabled: false,
          actionsEnabled: false,
          showInMenu: false,
          rolloutState: 'unregistered',
          releaseVersion: null,
        } as const;
      }
      return {
        moduleCode: code,
        exists: true,
        isEnabled: !!r.is_enabled,
        routesEnabled: !!r.routes_enabled,
        actionsEnabled: !!r.actions_enabled,
        showInMenu: !!r.show_in_menu,
        rolloutState: r.rollout_state ?? 'unknown',
        releaseVersion: r.release_version ?? null,
      } as const;
    });
  }
}
