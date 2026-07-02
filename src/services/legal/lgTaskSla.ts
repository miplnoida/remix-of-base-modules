/**
 * Legal Task SLA helpers.
 *
 * SLA status values (must match DB function public.lg_task_compute_sla):
 *   ON_TIME    – active, not near due date
 *   AT_RISK    – active, due within `atRiskHours`
 *   OVERDUE    – active, past due
 *   ESCALATED  – active, escalation_level > 0
 *   CLOSED     – status is COMPLETED / DONE / CLOSED / CANCELLED
 */
export type LgTaskSlaStatus = "ON_TIME" | "AT_RISK" | "OVERDUE" | "ESCALATED" | "CLOSED";

export const LG_TASK_TERMINAL_STATUSES = ["COMPLETED", "DONE", "CLOSED", "CANCELLED"] as const;

export function isTerminalTaskStatus(status: string | null | undefined): boolean {
  return !!status && (LG_TASK_TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function computeLgTaskSlaStatus(params: {
  status: string | null | undefined;
  dueDate: string | null | undefined;
  escalationLevel?: number | null;
  atRiskHours?: number | null;
  now?: Date;
}): LgTaskSlaStatus {
  const { status, dueDate, escalationLevel, atRiskHours, now = new Date() } = params;
  if (isTerminalTaskStatus(status)) return "CLOSED";
  if ((escalationLevel ?? 0) > 0) return "ESCALATED";
  if (!dueDate) return "ON_TIME";
  const due = new Date(`${dueDate}T23:59:59`);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs < 0) return "OVERDUE";
  const atRiskMs = (atRiskHours ?? 24) * 3_600_000;
  if (diffMs <= atRiskMs) return "AT_RISK";
  return "ON_TIME";
}

export const LG_TASK_SLA_LABEL: Record<LgTaskSlaStatus, string> = {
  ON_TIME: "On Time",
  AT_RISK: "At Risk",
  OVERDUE: "Overdue",
  ESCALATED: "Escalated",
  CLOSED: "Closed",
};

export const LG_TASK_SLA_TONE: Record<LgTaskSlaStatus, "success" | "warning" | "danger" | "muted" | "info"> = {
  ON_TIME: "success",
  AT_RISK: "warning",
  OVERDUE: "danger",
  ESCALATED: "danger",
  CLOSED: "muted",
};

export const LG_TASK_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  DONE: "Done",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const LG_TASK_PRIORITY_LABEL: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export function priorityRank(code: string | null | undefined): number {
  switch (code) {
    case "URGENT": return 4;
    case "HIGH":   return 3;
    case "MEDIUM": return 2;
    case "LOW":    return 1;
    default:       return 0;
  }
}
