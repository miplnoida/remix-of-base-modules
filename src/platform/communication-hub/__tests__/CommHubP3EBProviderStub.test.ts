/**
 * CH-SIMPLE-P3E-B.1 — Provider stub deterministic behaviour (unit).
 *
 * Verifies the provider stub itself, without any network or DB, ensuring:
 *   - stub-only activation gate
 *   - deterministic outcome classification
 *   - exactly-once semantics for a given invocation key
 *
 * These are pure-function assertions; not a substitute for the full
 * dispatcher/runtime harness (`run_ch_p3e_b_runtime_tests`).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  invokeProviderStub,
  isProviderStubActive,
  __resetProviderStubForTests,
} from "../../../../supabase/functions/_shared/communication-hub/provider-stub";

const g = globalThis as any;

function setProviderMode(v: string | undefined) {
  g.Deno = g.Deno ?? {};
  g.Deno.env = g.Deno.env ?? { get: (_k: string) => undefined };
  const store: Record<string, string | undefined> = { COMM_HUB_PROVIDER_MODE: v };
  g.Deno.env.get = (k: string) => store[k];
}

describe("CH-SIMPLE-P3E-B provider stub", () => {
  beforeEach(() => {
    __resetProviderStubForTests();
    setProviderMode("stub");
  });
  afterEach(() => __resetProviderStubForTests());

  it("is inactive by default", () => {
    setProviderMode(undefined);
    expect(isProviderStubActive()).toBe(false);
    expect(() =>
      invokeProviderStub({
        recipient: "accepted+a@example.test",
        providerInvocationKey: "abcdef01-invk",
        subject: "s", bodyHash: "h",
      }),
    ).toThrowError(/COMM_HUB_PROVIDER_MODE/);
  });

  it("classifies recipient fixtures deterministically", () => {
    const a = invokeProviderStub({
      recipient: "accepted+one@ex.test",
      providerInvocationKey: "key-accepted-000001",
      subject: "s", bodyHash: "h",
    });
    expect(a.status).toBe("PROVIDER_ACCEPTED");
    expect(a.providerMessageId).toMatch(/^stub-msg-/);
    expect(a.duplicateCall).toBe(false);

    const r = invokeProviderStub({
      recipient: "rejected+two@ex.test",
      providerInvocationKey: "key-rejected-000002",
      subject: "s", bodyHash: "h",
    });
    expect(r.status).toBe("PROVIDER_REJECTED");
    expect(r.providerMessageId).toBeNull();

    const t = invokeProviderStub({
      recipient: "timeout+three@ex.test",
      providerInvocationKey: "key-timeout-000003",
      subject: "s", bodyHash: "h",
    });
    expect(t.status).toBe("DELIVERY_PENDING");
    expect(t.warnings.some((w) => w.code === "provider_outcome_unconfirmed")).toBe(true);
  });

  it("returns the same outcome for a duplicate invocation key", () => {
    const first = invokeProviderStub({
      recipient: "accepted+dup@ex.test",
      providerInvocationKey: "dup-key-000000000001",
      subject: "s", bodyHash: "h",
    });
    const second = invokeProviderStub({
      recipient: "accepted+dup@ex.test",
      providerInvocationKey: "dup-key-000000000001",
      subject: "s", bodyHash: "h",
    });
    expect(second.status).toBe(first.status);
    expect(second.providerMessageId).toBe(first.providerMessageId);
    expect(second.duplicateCall).toBe(true);
  });

  it("rejects weak invocation keys", () => {
    expect(() =>
      invokeProviderStub({
        recipient: "accepted@ex.test",
        providerInvocationKey: "short",
        subject: "s", bodyHash: "h",
      }),
    ).toThrowError(/providerInvocationKey/);
  });
});
