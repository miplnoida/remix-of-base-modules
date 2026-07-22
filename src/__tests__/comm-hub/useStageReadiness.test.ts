/**
 * CH-GL-02 Slice B — useStageReadiness fan-out unit test.
 *
 * Verifies that the hook calls the server-side readiness RPC once per
 * target stage in a single coordinated refresh and derives per-mode
 * lock reasons for the Manual/Automated Production cards from the raw
 * server response.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const checkMock = vi.fn();

vi.mock("@/platform/communication-hub/readinessService", () => ({
  checkCommHubReadiness: (input: any) => checkMock(input),
}));

import { useStageReadiness } from "@/platform/communication-hub/useStageReadiness";

const STAGES = [
  "SAFE_TESTING",
  "CONTROLLED_STUB",
  "ONE_REAL_EMAIL",
  "MANUAL_PRODUCTION",
  "AUTOMATED_PRODUCTION",
];

function envelope(stage: string, ready: boolean, blockerTitle?: string) {
  return {
    ready,
    currentMode: "DRY_RUN",
    targetStage: stage,
    configurationVersion: 1,
    profile: null,
    blockers: ready
      ? []
      : [{ code: "event_not_certified", stage, severity: "critical", title: blockerTitle ?? "Event not certified" }],
    warnings: [],
    availableActions: [],
    evaluatedAt: new Date().toISOString(),
  };
}

describe("useStageReadiness", () => {
  beforeEach(() => {
    checkMock.mockReset();
  });

  it("fans out one readiness call per target stage in a single refresh", async () => {
    checkMock.mockImplementation((input: any) =>
      Promise.resolve(envelope(input.targetStage, input.targetStage === "SAFE_TESTING")),
    );
    const { result } = renderHook(() =>
      useStageReadiness({ moduleCode: "COMM_HUB", eventCode: "OPERATOR_REHEARSAL_RESULT_NOTICE" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    const calledStages = checkMock.mock.calls.map((c: any[]) => c[0].targetStage).sort();
    expect(calledStages).toEqual([...STAGES].sort());
    // Same event scope passed to every call.
    for (const call of checkMock.mock.calls) {
      expect(call[0].moduleCode).toBe("COMM_HUB");
      expect(call[0].eventCode).toBe("OPERATOR_REHEARSAL_RESULT_NOTICE");
    }
  });

  it("locks Manual/Automated Production with a business-language reason from the server", async () => {
    checkMock.mockImplementation((input: any) => {
      const production =
        input.targetStage === "MANUAL_PRODUCTION" || input.targetStage === "AUTOMATED_PRODUCTION";
      return Promise.resolve(
        envelope(input.targetStage, !production, production ? "Event not certified for production" : undefined),
      );
    });
    const { result } = renderHook(() =>
      useStageReadiness({ moduleCode: "COMM_HUB", eventCode: "OPERATOR_REHEARSAL_RESULT_NOTICE" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.modeLockReason.DRY_RUN).toBeNull();
    expect(result.current.modeLockReason.CONTROLLED_LIVE).toBeNull();
    expect(result.current.modeLockReason.EMERGENCY_STOP).toBeNull();
    expect(result.current.modeLockReason.MANUAL_PRODUCTION).toBe("Event not certified for production");
    expect(result.current.modeLockReason.AUTOMATED_PRODUCTION).toBe("Event not certified for production");
  });

  it("re-runs the fan-out when refresh() is called", async () => {
    checkMock.mockImplementation((input: any) => Promise.resolve(envelope(input.targetStage, true)));
    const { result } = renderHook(() =>
      useStageReadiness({ moduleCode: "COMM_HUB", eventCode: "OPERATOR_REHEARSAL_RESULT_NOTICE" }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCalls = checkMock.mock.calls.length;
    await act(async () => {
      await result.current.refresh();
    });
    expect(checkMock.mock.calls.length).toBe(initialCalls + STAGES.length);
  });
});
