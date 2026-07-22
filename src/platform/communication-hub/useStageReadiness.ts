/**
 * CH-GL-02 Slice B — Stage-aware readiness fan-out.
 *
 * The Go Live page needs readiness for every downstream stage in one
 * coordinated refresh, not just the immediate next one. This hook fans
 * out `check_comm_hub_readiness` for the five target stages and returns
 * the raw envelopes plus a per-mode locked-reason map that
 * ReleaseModeCards consumes to render "Locked — <exact reason>" states.
 *
 * The hook is READ-ONLY. It never mutates settings, never sends, and
 * never fabricates authorisation. When no event is selected it returns
 * empty envelopes so cards can still render an "event required" hint.
 *
 * Re-fetch triggers:
 *   - initial mount
 *   - moduleCode / eventCode / channel change
 *   - `refresh()` call (from mode change, dialog return, or a Fix return)
 *   - window `focus` and `visibilitychange` (Fix-and-return pattern)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkCommHubReadiness,
  type ReadinessEnvelope,
  type ReleaseStageTarget,
} from "./readinessService";
import type { CommunicationOperatingMode } from "./releaseModeService";

const STAGES: ReleaseStageTarget[] = [
  "SAFE_TESTING",
  "CONTROLLED_STUB",
  "ONE_REAL_EMAIL",
  "MANUAL_PRODUCTION",
  "AUTOMATED_PRODUCTION",
];

export interface StageReadinessInput {
  moduleCode: string | null | undefined;
  eventCode: string | null | undefined;
  channel?: string;
}

export interface StageReadinessState {
  loading: boolean;
  error: string | null;
  stages: Partial<Record<ReleaseStageTarget, ReadinessEnvelope>>;
  /** Human-readable single-line reason a given mode is locked; `null` when ready. */
  modeLockReason: Partial<Record<CommunicationOperatingMode, string | null>>;
  /** Human-readable single-line reason a given target stage is locked; `null` when ready. */
  stageLockReason: Partial<Record<ReleaseStageTarget, string | null>>;
  evaluatedAt: string | null;
  refresh: () => void;
}


/** Convert stage envelope blockers into a single-line reason for card display. */
function summarizeBlockers(env: ReadinessEnvelope | undefined): string | null {
  if (!env) return "Readiness not evaluated yet.";
  if (env.ready) return null;
  const primary = env.blockers[0];
  if (primary) {
    return primary.title || primary.message || primary.code;
  }
  return "Readiness prerequisites not satisfied.";
}

export function useStageReadiness(input: StageReadinessInput): StageReadinessState {
  const { moduleCode, eventCode, channel } = input;
  const [state, setState] = useState<
    Pick<StageReadinessState, "loading" | "error" | "stages" | "evaluatedAt">
  >({
    loading: false,
    error: null,
    stages: {},
    evaluatedAt: null,
  });
  const mounted = useRef(true);
  const seq = useRef(0);

  const runFanOut = useCallback(async () => {
    const my = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const results = await Promise.all(
        STAGES.map((stage) =>
          checkCommHubReadiness({
            moduleCode: moduleCode ?? null,
            eventCode: eventCode ?? null,
            channel: channel ?? "email",
            targetStage: stage,
          }).then(
            (env) => ({ stage, env, error: null as string | null }),
            (err) => ({
              stage,
              env: null as ReadinessEnvelope | null,
              error: err?.message ?? "readiness check failed",
            }),
          ),
        ),
      );
      if (!mounted.current || my !== seq.current) return;
      const stages: Partial<Record<ReleaseStageTarget, ReadinessEnvelope>> = {};
      const errors: string[] = [];
      for (const r of results) {
        if (r.env) stages[r.stage] = r.env;
        else if (r.error) errors.push(`${r.stage}: ${r.error}`);
      }
      setState({
        loading: false,
        error: errors.length ? errors.join("; ") : null,
        stages,
        evaluatedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      if (!mounted.current || my !== seq.current) return;
      setState((s) => ({ ...s, loading: false, error: e?.message ?? "readiness fan-out failed" }));
    }
  }, [moduleCode, eventCode, channel]);

  useEffect(() => {
    mounted.current = true;
    void runFanOut();
    return () => { mounted.current = false; };
  }, [runFanOut]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") void runFanOut();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [runFanOut]);

  // Map stage readiness -> per-mode lock reason for ReleaseModeCards.
  // DRY_RUN + CONTROLLED_LIVE are always selectable (no cert required).
  const modeLockReason: Partial<Record<CommunicationOperatingMode, string | null>> = {
    DRY_RUN: null,
    CONTROLLED_LIVE: null,
    MANUAL_PRODUCTION: summarizeBlockers(state.stages.MANUAL_PRODUCTION),
    AUTOMATED_PRODUCTION: summarizeBlockers(state.stages.AUTOMATED_PRODUCTION),
    EMERGENCY_STOP: null, // Emergency Stop is always available.
  };

  return {
    ...state,
    modeLockReason,
    refresh: runFanOut,
  };
}
