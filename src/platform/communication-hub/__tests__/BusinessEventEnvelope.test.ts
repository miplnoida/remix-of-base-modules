import { describe, expect, it } from "vitest";
import { validateBusinessEventEnvelope, BUSINESS_EVENT_ENVELOPE_VERSION } from "../contracts/BusinessEventEnvelope";

const base = {
  envelopeVersion: BUSINESS_EVENT_ENVELOPE_VERSION,
  moduleCode: "APPEALS",
  eventCode: "APPEAL_RECEIVED_NOTICE",
  channel: "email" as const,
  reference: { qualified: "APPEALS/APPEAL/APL-1", entityType: "APPEAL", entityId: "APL-1" },
  recipient: { channel: "email" as const, displayName: "Test" },
  payload: { appeal: { reference: "APL-1", case_reference: "C-1", submitted_at: "2026-07-22T00:00:00Z" } },
  idempotencyKey: "biz-1",
};

describe("BusinessEventEnvelope", () => {
  it("accepts a well-formed envelope", () => {
    const r = validateBusinessEventEnvelope(base);
    expect(r.ok).toBe(true);
  });
  it("rejects reserved platform fields", () => {
    const r = validateBusinessEventEnvelope({ ...base, templateId: "x" });
    if (r.ok) throw new Error("expected failure");
    expect(r.errors.some((e) => e.code === "reserved_platform_field")).toBe(true);
  });
  it("rejects missing idempotencyKey", () => {
    const { idempotencyKey: _drop, ...rest } = base;
    const r = validateBusinessEventEnvelope(rest);
    expect(r.ok).toBe(false);
  });
  it("rejects wrong envelopeVersion", () => {
    const r = validateBusinessEventEnvelope({ ...base, envelopeVersion: "vNext" });
    expect(r.ok).toBe(false);
  });
});
