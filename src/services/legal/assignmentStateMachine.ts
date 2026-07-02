import type { RecoveryAssignmentStatus } from "@/types/legal/recoveryAssignment";
import type { LgCapability } from "@/hooks/legal/useLgAccess";

/**
 * EPIC-06D — Recovery Assignment state machine.
 * Draft → Assigned → Active → (Suspended|Escalated) → Completed → Closed
 */
export const ASSIGNMENT_TRANSITIONS: Record<
  RecoveryAssignmentStatus,
  { to: RecoveryAssignmentStatus; capability: LgCapability }[]
> = {
  DRAFT:      [
    { to: "ASSIGNED",  capability: "assignRecoveryOfficer" as LgCapability },
    { to: "CLOSED",    capability: "closeRecoveryAssignment" as LgCapability },
  ],
  ASSIGNED:   [
    { to: "ACTIVE",    capability: "editRecoveryAssignment" as LgCapability },
    { to: "SUSPENDED", capability: "editRecoveryAssignment" as LgCapability },
    { to: "CLOSED",    capability: "closeRecoveryAssignment" as LgCapability },
  ],
  ACTIVE:     [
    { to: "SUSPENDED", capability: "editRecoveryAssignment" as LgCapability },
    { to: "ESCALATED", capability: "escalateRecoveryAssignment" as LgCapability },
    { to: "COMPLETED", capability: "editRecoveryAssignment" as LgCapability },
    { to: "CLOSED",    capability: "closeRecoveryAssignment" as LgCapability },
  ],
  SUSPENDED:  [
    { to: "ACTIVE",    capability: "editRecoveryAssignment" as LgCapability },
    { to: "CLOSED",    capability: "closeRecoveryAssignment" as LgCapability },
  ],
  ESCALATED:  [
    { to: "ACTIVE",    capability: "editRecoveryAssignment" as LgCapability },
    { to: "COMPLETED", capability: "editRecoveryAssignment" as LgCapability },
    { to: "CLOSED",    capability: "closeRecoveryAssignment" as LgCapability },
  ],
  COMPLETED:  [
    { to: "CLOSED",    capability: "closeRecoveryAssignment" as LgCapability },
  ],
  CLOSED:     [],
};

export function canTransitionAssignment(
  from: RecoveryAssignmentStatus,
  to: RecoveryAssignmentStatus,
  capabilities: Set<LgCapability>,
): { ok: boolean; reason?: string } {
  const options = ASSIGNMENT_TRANSITIONS[from] ?? [];
  const t = options.find((o) => o.to === to);
  if (!t) return { ok: false, reason: `Illegal transition ${from} → ${to}` };
  if (!capabilities.has(t.capability)) {
    return { ok: false, reason: `Missing capability: ${t.capability}` };
  }
  return { ok: true };
}

export function assertAssignmentTransition(
  from: RecoveryAssignmentStatus,
  to: RecoveryAssignmentStatus,
  capabilities: Set<LgCapability>,
): void {
  const r = canTransitionAssignment(from, to, capabilities);
  if (!r.ok) throw new Error(r.reason);
}
