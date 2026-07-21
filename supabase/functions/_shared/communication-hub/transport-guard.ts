/**
 * CH-SIMPLE-P3D-B.2.a — Shared transport-boundary guard.
 *
 * This module is the SINGLE common boundary that must run immediately
 * before any real email/SMS/etc. provider transport is invoked from the
 * Communication Hub. Every provider adapter must be reached only through
 * `sendEmailViaGuardedTransport()`.
 *
 * The guard NEVER trusts caller-supplied booleans such as `isDryRun`,
 * `sendContext`, `providerCallAllowed`. It resolves authoritative
 * database evidence via `resolve_comm_hub_transport_guard(jsonb)` using
 * the message/request identity supplied by the caller.
 *
 * Fail-closed codes returned:
 *   - DRY_RUN_PROVIDER_INVOCATION_BLOCKED
 *   - PROVIDER_EVIDENCE_NOT_FOUND
 *   - PROVIDER_CONTEXT_MISMATCH
 *   - PROVIDER_CONTEXT_UNVERIFIABLE
 */

// deno-lint-ignore-file no-explicit-any

import {
  sendEmailViaProvider,
  type CommHubEmailPayload,
  type CommHubTransportResult,
} from "./transport-email.ts";
import type { CommHubEmailProvider } from "./provider-lookup.ts";

export type TransportGuardBlockCode =
  | "DRY_RUN_PROVIDER_INVOCATION_BLOCKED"
  | "PROVIDER_EVIDENCE_NOT_FOUND"
  | "PROVIDER_CONTEXT_MISMATCH"
  | "PROVIDER_CONTEXT_UNVERIFIABLE";

export type ProviderTransportGuardResult =
  | {
      allowed: true;
      requestId: string;
      messageId: string;
      authoritativeSendContext: string;
    }
  | {
      allowed: false;
      code: TransportGuardBlockCode;
      requestId?: string;
      messageId?: string;
      authoritativeSendContext?: string;
      auditId?: string;
    };

export interface TransportGuardInput {
  messageId: string;
  requestId?: string | null;
  attemptedProvider?: string | null;
  callerFunction?: string | null;
  callerContext?: string | null;
  correlationId?: string | null;
  traceId?: string | null;
}

/**
 * Resolve the authoritative transport-boundary decision for a message.
 * On any failure to reach the DB, we return PROVIDER_CONTEXT_UNVERIFIABLE
 * so the transport stays fail-closed.
 */
export async function resolveTransportGuard(
  admin: any,
  input: TransportGuardInput,
): Promise<ProviderTransportGuardResult> {
  try {
    const { data, error } = await admin.rpc("resolve_comm_hub_transport_guard", {
      p_payload: {
        message_id: input.messageId ?? null,
        request_id: input.requestId ?? null,
        attempted_provider: input.attemptedProvider ?? null,
        caller_function: input.callerFunction ?? null,
        caller_context: input.callerContext ?? null,
        correlation_id: input.correlationId ?? null,
        trace_id: input.traceId ?? null,
      },
    });
    if (error || !data) {
      return { allowed: false, code: "PROVIDER_CONTEXT_UNVERIFIABLE" };
    }
    if (data.allowed === true) {
      return {
        allowed: true,
        requestId: data.request_id,
        messageId: data.message_id,
        authoritativeSendContext: data.authoritative_send_context ?? "live",
      };
    }
    return {
      allowed: false,
      code: (data.code ?? "PROVIDER_CONTEXT_UNVERIFIABLE") as TransportGuardBlockCode,
      requestId: data.request_id ?? undefined,
      messageId: data.message_id ?? undefined,
      authoritativeSendContext: data.authoritative_send_context ?? undefined,
      auditId: data.audit_id ?? undefined,
    };
  } catch {
    return { allowed: false, code: "PROVIDER_CONTEXT_UNVERIFIABLE" };
  }
}

export interface GuardedTransportRefusal {
  ok: false;
  guardBlocked: true;
  code: TransportGuardBlockCode;
  auditId?: string;
  authoritativeSendContext?: string;
}

/**
 * Every provider transport invocation from the Hub goes through this
 * single boundary. The provider adapter (`sendEmailViaProvider`) is
 * reached only after `resolveTransportGuard` allows the call.
 */
export async function sendEmailViaGuardedTransport(
  admin: any,
  args: {
    guard: TransportGuardInput;
    provider: CommHubEmailProvider;
    payload: CommHubEmailPayload;
    opts?: { fallbackResendKey?: string };
  },
): Promise<CommHubTransportResult | GuardedTransportRefusal> {
  const decision = await resolveTransportGuard(admin, {
    ...args.guard,
    attemptedProvider: args.guard.attemptedProvider ?? args.provider.type,
  });
  if (!decision.allowed) {
    return {
      ok: false,
      guardBlocked: true,
      code: decision.code,
      auditId: decision.auditId,
      authoritativeSendContext: decision.authoritativeSendContext,
    };
  }
  // Adapter-level defensive check flag — proves the caller routed through
  // the boundary. `sendEmailViaProvider` refuses to run without it.
  return await sendEmailViaProvider(args.provider, args.payload, {
    ...(args.opts ?? {}),
    // @ts-expect-error boundary-only sentinel understood by the adapter
    __boundaryVerified: true,
  });
}

export function isGuardRefusal(
  r: CommHubTransportResult | GuardedTransportRefusal,
): r is GuardedTransportRefusal {
  return (r as any)?.guardBlocked === true;
}
