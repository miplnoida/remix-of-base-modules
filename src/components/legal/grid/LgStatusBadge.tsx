/**
 * LgStatusBadge — wraps the shared Benefits BnStatusBadge so Legal screens
 * render identical visual treatment for status / stage / priority chips.
 *
 * Maps Legal-specific codes (OPEN/IN_PROGRESS/ESCALATED/OVERDUE/…) onto the
 * BN status scheme so we don't fork the colour system.
 */
import React from "react";
import { BnStatusBadge } from "@/components/bn/shared/BnStatusBadge";

const LG_TO_BN: Record<string, string> = {
  // Case lifecycle
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "INTAKE_REVIEW",
  REVIEW: "INTAKE_REVIEW",
  AWAITING_HEARING: "SCHEDULED",
  HEARING_SCHEDULED: "SCHEDULED",
  SETTLED: "APPROVED",
  CLOSED: "CLOSED",
  WITHDRAWN: "WITHDRAWN",
  ESCALATED: "URGENT",
  OVERDUE: "DENIED",
  // Fee / waiver
  DRAFT: "DRAFT",
  POSTED: "APPROVED",
  REVERSED: "CANCELLED",
  WAIVED: "WAIVED",
  WAIVER_PENDING: "PENDING",
  AUTO_APPROVED: "APPROVED",
  SUBMITTED: "SUBMITTED",
  REJECTED: "REJECTED",
  // Hearing
  SCHEDULED: "SCHEDULED",
  CONCLUDED: "CLOSED",
  ADJOURNED: "PENDING",
  CANCELLED: "CANCELLED",
  // Priority
  LOW: "LOW",
  MEDIUM: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
  // Generic
  ACTIVE: "ACTIVE",
  INACTIVE: "ARCHIVED",
  PENDING: "PENDING",
};

interface Props {
  status?: string | null;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export const LgStatusBadge: React.FC<Props> = ({ status, label, size = "md", className }) => {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const mapped = LG_TO_BN[status] ?? status;
  return <BnStatusBadge status={mapped} label={label ?? status.replace(/_/g, " ")} size={size} className={className} />;
};
