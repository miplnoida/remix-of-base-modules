/**
 * Validation helpers for signature/stamp assets.
 * - validateAssetForUse: returns blocking reasons (archived, unapproved, expired, scope mismatch).
 * - validateAssetQuality: returns non-blocking warnings (transparent bg, resolution).
 */
import type { CommMediaAsset } from "@/hooks/comm/useMediaAssets";

export interface ValidationResult {
  blocking: string[];
  warnings: string[];
}

const SIGNATURE_CATEGORIES = new Set(["signature", "stamp", "seal"]);

export function validateAssetForUse(
  asset: CommMediaAsset | null | undefined,
  opts?: {
    module_code?: string | null;
    department_code?: string | null;
    document_confidentiality?: string | null; // e.g. "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET"
  },
): ValidationResult {
  const result: ValidationResult = { blocking: [], warnings: [] };
  if (!asset) {
    result.blocking.push("Asset not found.");
    return result;
  }
  if (!asset.is_active) result.blocking.push("Asset is archived/inactive.");
  if (asset.approval_status !== "approved") {
    result.blocking.push(`Asset is not approved (status: ${asset.approval_status}).`);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (asset.effective_from && today < asset.effective_from) {
    result.blocking.push(`Asset not effective until ${asset.effective_from}.`);
  }
  if (asset.effective_to && today > asset.effective_to) {
    result.blocking.push(`Asset expired on ${asset.effective_to}.`);
  }

  // Module / department scope
  const restrictions = (asset as any).usage_restrictions ?? {};
  if (Array.isArray(restrictions.allowed_modules) && opts?.module_code) {
    if (!restrictions.allowed_modules.includes(opts.module_code)) {
      result.blocking.push(`Not allowed for module "${opts.module_code}".`);
    }
  }
  if (Array.isArray(restrictions.allowed_departments) && opts?.department_code) {
    if (!restrictions.allowed_departments.includes(opts.department_code)) {
      result.blocking.push(`Not allowed for department "${opts.department_code}".`);
    }
  }

  // Confidentiality ceiling
  const order = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "SECRET"];
  const max = (asset as any).max_document_confidentiality_allowed as string | null | undefined;
  if (max && opts?.document_confidentiality) {
    const maxIdx = order.indexOf(max.toUpperCase());
    const docIdx = order.indexOf(opts.document_confidentiality.toUpperCase());
    if (maxIdx >= 0 && docIdx > maxIdx) {
      result.blocking.push(`Asset cannot be used on ${opts.document_confidentiality} documents (max: ${max}).`);
    }
  }
  return result;
}

export function validateAssetQuality(asset: CommMediaAsset | null | undefined): ValidationResult {
  const result: ValidationResult = { blocking: [], warnings: [] };
  if (!asset) return result;
  if (SIGNATURE_CATEGORIES.has(asset.category)) {
    const transparentRequired = (asset as any).transparent_background_required as boolean | null | undefined;
    if (transparentRequired && asset.mime_type && asset.mime_type !== "image/png" && asset.mime_type !== "image/svg+xml") {
      result.warnings.push("Asset is marked as requiring transparent background but file is not PNG/SVG.");
    }
    if ((asset.width_px ?? 0) > 0 && (asset.width_px ?? 0) < 300) {
      result.warnings.push(`Low resolution (${asset.width_px}px wide). Recommended ≥ 300px.`);
    }
  }

  return result;
}
