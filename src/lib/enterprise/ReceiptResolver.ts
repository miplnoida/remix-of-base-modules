/**
 * Phase 12 — Receipt / Statement / Certificate Resolver
 *
 * Financial documents inherit all branding (logo, address, signature,
 * letterhead, footer, disclaimer) from the canonical enterprise stack —
 * Organization → Department → Module → Document Type — and only carry
 * their own *financial layout* concerns (column widths, currency,
 * amount-in-words policy, copy markers).
 *
 * This resolver is a thin convenience over `resolveCommunication()` so
 * the Finance module never reaches into branding tables directly.
 */

import { resolveCommunication } from "./CommunicationResolver";
import type { CommunicationRequest, ResolvedCommunication } from "./types";

export type FinancialDocKind = "RECEIPT" | "STATEMENT" | "CERTIFICATE";

export interface FinancialLayout {
  currencyCode: string;
  amountInWords: boolean;
  copyMarkers: string[]; // ["ORIGINAL", "DUPLICATE", "TRIPLICATE"]
  showQrCode: boolean;
  perforationLine: boolean;
}

const DEFAULT_LAYOUT: Record<FinancialDocKind, FinancialLayout> = {
  RECEIPT: {
    currencyCode: "XCD",
    amountInWords: true,
    copyMarkers: ["ORIGINAL", "DUPLICATE"],
    showQrCode: true,
    perforationLine: true,
  },
  STATEMENT: {
    currencyCode: "XCD",
    amountInWords: false,
    copyMarkers: [],
    showQrCode: false,
    perforationLine: false,
  },
  CERTIFICATE: {
    currencyCode: "XCD",
    amountInWords: false,
    copyMarkers: ["ORIGINAL"],
    showQrCode: true,
    perforationLine: false,
  },
};

export interface ResolvedFinancialDoc {
  communication: ResolvedCommunication;
  kind: FinancialDocKind;
  layout: FinancialLayout;
}

export async function resolveFinancialDoc(
  kind: FinancialDocKind,
  req: Omit<CommunicationRequest, "profileCode" | "documentProfileCode">,
): Promise<ResolvedFinancialDoc> {
  const communication = await resolveCommunication({
    ...req,
    profileCode: kind === "RECEIPT" ? "RECEIPT" : kind === "STATEMENT" ? "STATEMENT" : "CERTIFICATE",
    documentProfileCode: kind,
  });
  return { communication, kind, layout: DEFAULT_LAYOUT[kind] };
}
