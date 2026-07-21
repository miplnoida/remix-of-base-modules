/**
 * CH-SIMPLE-P3E-C — Certification service unit tests.
 *
 * Verifies RPC payload shapes and row->camelCase mapping. All state
 * changes must flow through SECURITY DEFINER RPCs; direct table writes
 * from the client are forbidden.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

import {
  getControlledLiveCertification,
  recordControlledLiveManualVerification,
} from "@/platform/communication-hub/controlledLiveCertificationService";

beforeEach(() => {
  rpcMock.mockReset();
});

describe("controlledLiveCertificationService", () => {
  it("get_controlled_live_certification maps a row to camelCase", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          id: "c1",
          certification_no: 42,
          execution_id: "e1",
          module_code: "BENEFITS",
          event_code: "AWARD_ISSUED",
          channel: "email",
          recipient_set_hash: "abc",
          preview_snapshot_id: "s1",
          preview_approval_id: "a1",
          dry_run_certification_id: "d1",
          request_id: "r1",
          message_id: "m1",
          delivery_attempt_id: "da1",
          trace_id: "t1",
          provider_name: "stub",
          provider_message_id: "pm1",
          provider_outcome: "PROVIDER_ACCEPTED",
          provider_status: "ok",
          status: "PROVIDER_ACCEPTED",
          manual_verification_status: null,
          manual_verification_received_at: null,
          manual_verification_recipient: null,
          manual_verification_note: null,
          manual_verified_by: null,
          manual_verified_at: null,
          recipient_policy_version: 3,
          configuration_version: 7,
          operating_mode_prior: "DRY_RUN",
          operating_mode_final: "DRY_RUN",
          cleanup_succeeded: true,
          certified_at: "2026-07-21T12:00:00Z",
          certified_by: "user-1",
          invalidation_reason: null,
          invalidated_at: null,
          invalidated_by: null,
        },
      ],
      error: null,
    });
    const cert = await getControlledLiveCertification("c1");
    expect(rpcMock).toHaveBeenCalledWith(
      "get_controlled_live_certification",
      { p_certification_id: "c1" },
    );
    expect(cert).not.toBeNull();
    expect(cert!.certificationNo).toBe(42);
    expect(cert!.recipientPolicyVersion).toBe(3);
    expect(cert!.operatingModePrior).toBe("DRY_RUN");
  });

  it("get_controlled_live_certification returns null when RPC returns empty", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const cert = await getControlledLiveCertification("missing");
    expect(cert).toBeNull();
  });

  it("record_controlled_live_manual_verification sends the correct payload", async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        ok: true,
        certification_id: "c1",
        status: "DELIVERY_CONFIRMED_MANUALLY",
        manual_verification_status: "CONFIRMED",
        manual_verified_at: "2026-07-21T12:15:00Z",
      },
      error: null,
    });
    const r = await recordControlledLiveManualVerification({
      certificationId: "c1",
      received: true,
      verifiedRecipient: "ops@example.com",
      note: "confirmed inbox",
    });
    expect(rpcMock).toHaveBeenCalledWith(
      "record_controlled_live_manual_verification",
      {
        p_payload: {
          certification_id: "c1",
          received: true,
          verified_recipient: "ops@example.com",
          note: "confirmed inbox",
        },
      },
    );
    expect(r.status).toBe("DELIVERY_CONFIRMED_MANUALLY");
    expect(r.manualVerificationStatus).toBe("CONFIRMED");
  });

  it("record_controlled_live_manual_verification propagates RPC errors", async () => {
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: "admin role required for manual controlled-live verification" },
    });
    await expect(
      recordControlledLiveManualVerification({
        certificationId: "c1",
        received: false,
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("admin role required"),
    });
  });
});
