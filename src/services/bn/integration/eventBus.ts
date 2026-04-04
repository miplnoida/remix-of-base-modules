/**
 * BN Module Event Bus
 * 
 * Publishes domain events to bn_module_events table for platform consumption.
 * Other modules subscribe via Supabase Realtime or polling.
 * 
 * Events follow the pattern: bn.<entity>.<action>
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type BnEventType =
  | 'bn.claim.registered'
  | 'bn.claim.status_changed'
  | 'bn.claim.docs_requested'
  | 'bn.claim.approved'
  | 'bn.claim.denied'
  | 'bn.award.created'
  | 'bn.award.suspended'
  | 'bn.award.resumed'
  | 'bn.award.terminated'
  | 'bn.payment.instruction_created'
  | 'bn.calc.completed'
  | 'bn.evidence.status_changed'
  | 'bn.product.version_activated';

export interface BnEvent {
  event_type: BnEventType;
  entity_type: string;
  entity_id: string;
  payload: Record<string, any>;
  published_by?: string;
}

/**
 * Publish a domain event. Fire-and-forget — never blocks the caller.
 */
export async function publishBnEvent(event: BnEvent): Promise<void> {
  try {
    await db.from('bn_module_events').insert({
      event_type: event.event_type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      payload: event.payload,
      published_by: event.published_by,
      published_at: new Date().toISOString(),
      consumed: false,
    });
  } catch (err) {
    // Events are non-blocking — log but never throw
    console.error('[BN EventBus] Failed to publish event:', event.event_type, err);
  }
}

/**
 * Subscribe to BN events via Supabase Realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToBnEvents(
  eventTypes: BnEventType[],
  callback: (event: BnEvent & { id: string; published_at: string }) => void
): () => void {
  const channel = supabase
    .channel('bn-events')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bn_module_events',
      },
      (payload: any) => {
        const row = payload.new;
        if (eventTypes.includes(row.event_type)) {
          callback({
            id: row.id,
            event_type: row.event_type,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            payload: row.payload,
            published_by: row.published_by,
            published_at: row.published_at,
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Poll for unconsumed events (for modules that don't use Realtime).
 */
export async function pollBnEvents(
  eventTypes: BnEventType[],
  limit = 50
): Promise<Array<BnEvent & { id: string; published_at: string }>> {
  const { data, error } = await db
    .from('bn_module_events')
    .select('*')
    .in('event_type', eventTypes)
    .eq('consumed', false)
    .order('published_at')
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/**
 * Mark events as consumed after processing.
 */
export async function markEventsConsumed(eventIds: string[]): Promise<void> {
  if (!eventIds.length) return;
  const { error } = await db
    .from('bn_module_events')
    .update({ consumed: true, consumed_at: new Date().toISOString() })
    .in('id', eventIds);
  if (error) throw error;
}
