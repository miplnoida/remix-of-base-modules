/**
 * EPIC-2A — Client-side onboarding catalogue for the Business-Module
 * Readiness Matrix and Generic Event Pilot. Small, curated list of
 * events we are actively onboarding. Not a full canonical registry.
 */
export interface PilotEvent {
  moduleCode: string;
  eventCode: string;
  eventName: string;
  defaultChannels: string[];
  defaultRecipient: string;
  risk: "low" | "medium" | "high" | "sensitive";
  templateCode: string;
  description: string;
  requiredTokens: string[];
}

export const PILOT_EVENT_CATALOGUE: PilotEvent[] = [
  {
    moduleCode: "COMM_HUB",
    eventCode: "ADMIN_TEST_NOTICE",
    eventName: "Admin Test Notice",
    defaultChannels: ["EMAIL"],
    defaultRecipient: "ADMIN_USER",
    risk: "low",
    templateCode: "COMM_HUB_ADMIN_TEST_NOTICE_EMAIL",
    description:
      "Internal admin diagnostic notice used to validate the Communication Hub sending spine end-to-end.",
    requiredTokens: ["recipient_name", "request_no", "generated_at"],
  },
  {
    moduleCode: "EMPLOYER_REGISTRATION",
    eventCode: "INTERNAL_ACKNOWLEDGEMENT_NOTICE",
    eventName: "Internal Employer Registration Acknowledgement Notice",
    defaultChannels: ["EMAIL"],
    defaultRecipient: "ADMIN_USER",
    risk: "low",
    templateCode: "EMPLOYER_REGISTRATION_INTERNAL_ACK_EMAIL",
    description:
      "Internal dry-run acknowledgement used to validate business-module Communication Hub onboarding.",
    requiredTokens: [
      "recipient_name", "employer_name", "reference_no", "request_no", "generated_at",
    ],
  },
  {
    moduleCode: "EMPLOYER_REGISTRATION",
    eventCode: "INTERNAL_APPROVAL_REVIEW_NOTICE",
    eventName: "Internal Employer Registration Approval Review Notice",
    defaultChannels: ["EMAIL"],
    defaultRecipient: "ADMIN_USER",
    risk: "low",
    templateCode: "EMPLOYER_REGISTRATION_INTERNAL_APPROVAL_REVIEW_EMAIL",
    description:
      "Internal dry-run notice to validate Communication Hub onboarding for employer registration approval review workflow.",
    requiredTokens: [
      "recipient_name", "employer_name", "reference_no", "review_status", "request_no", "generated_at",
    ],
  },
  {
    moduleCode: "COMPLIANCE",
    eventCode: "INTERNAL_CASE_STATUS_NOTICE",
    eventName: "Internal Compliance Case Status Notice",
    defaultChannels: ["EMAIL"],
    defaultRecipient: "ADMIN_USER",
    risk: "low",
    templateCode: "COMPLIANCE_INTERNAL_CASE_STATUS_EMAIL",
    description:
      "Internal dry-run notice to validate Communication Hub onboarding for Compliance module (EPIC 2D).",
    requiredTokens: [
      "recipient_name", "case_reference", "case_status", "assigned_officer", "request_no", "generated_at",
    ],
  },
];
