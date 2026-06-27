/**
 * Enterprise Communication Resolver — THE single entry point.
 *
 * Every module (Legal, Benefits, Compliance, Finance, HR, Registration,
 * Employer Services and any future module) MUST go through
 * `resolveCommunication()` for any communication-producing operation.
 *
 * Do NOT read `comm_*`, `core_template`, `core_text_block`,
 * `comm_media_asset` or `core_organization` directly from a module —
 * use this resolver. This guarantees:
 *   - inheritance is applied uniformly (org → module → dept → location → user)
 *   - profiles (Communication + Document) are composed consistently
 *   - audit trace is always recorded
 *   - reference validation can block deletes of anything used by templates
 *   - swapping the underlying tables never requires touching modules
 *
 * The resolver composes four sub-resolvers:
 *   - communicationResolver (org / dept / location / letterhead / signature)
 *   - profileResolver        (Communication + Document Profiles)
 *   - templateResolver       (core_template with parent chain)
 *   - textBlockResolver      (core_text_block with parent chain)
 *   - assetResolver          (existing comm asset resolver)
 */

import { resolveCommunicationContext } from "@/lib/comm/communicationResolver";
import { resolveCommAssets } from "@/lib/comm/assetResolver";
import {
  resolveCommunicationProfile,
  resolveDocumentProfile,
} from "./resolvers/profileResolver";
import { resolveTemplate } from "./resolvers/templateResolver";
import { resolveTextBlocks } from "./resolvers/textBlockResolver";
import type {
  CommunicationRequest,
  ResolvedCommunication,
  ResolutionTraceEntry,
  DeliveryChannel,
  ResolvedAssetMap,
} from "./types";

const DEFAULT_CHANNELS: DeliveryChannel[] = ["EMAIL", "PRINT", "PDF"];

export async function resolveCommunication(
  req: CommunicationRequest,
): Promise<ResolvedCommunication> {
  const trace: ResolutionTraceEntry[] = [];

  const [context, communicationProfile, documentProfile, template] =
    await Promise.all([
      resolveCommunicationContext(req.moduleCode),
      resolveCommunicationProfile(req.profileCode ?? null),
      resolveDocumentProfile(req.documentProfileCode ?? null),
      resolveTemplate(req.templateCode ?? null),
    ]);

  trace.push({
    layer: "ORGANIZATION",
    key: req.moduleCode,
    resolved_from: context.organization.name ? "ORGANIZATION" : "MISSING",
    ok: !!context.organization.name,
  });
  if (req.profileCode)
    trace.push({
      layer: "PROFILE",
      key: req.profileCode,
      resolved_from: communicationProfile ? communicationProfile.owner_scope : "MISSING",
      ok: !!communicationProfile,
    });
  if (req.documentProfileCode)
    trace.push({
      layer: "PROFILE",
      key: req.documentProfileCode,
      resolved_from: documentProfile ? documentProfile.owner_scope : "MISSING",
      ok: !!documentProfile,
    });
  if (req.templateCode)
    trace.push({
      layer: "TEMPLATE",
      key: req.templateCode,
      resolved_from: template ? template.owner_scope : "MISSING",
      ok: !!template,
    });

  // Assets — composed from profile config + template defaults.
  const assetCategories = uniq([
    ...(asArray(communicationProfile?.config?.["asset_categories"])),
    ...(asArray(documentProfile?.config?.["asset_categories"])),
  ]);
  const rawAssets = assetCategories.length
    ? await resolveCommAssets(assetCategories as any, {
        moduleCode: req.moduleCode,
        departmentCode: req.departmentCode ?? undefined,
        locationId: req.locationId ?? undefined,
      })
    : {};
  const assets: ResolvedAssetMap = {};
  for (const [k, v] of Object.entries(rawAssets)) {
    assets[k] = v
      ? {
          id: v.asset_id,
          code: null,
          category: k,
          url: v.url,
          resolved_via: (v.resolved_via?.toUpperCase() as any) ?? "SYSTEM_DEFAULT",
          is_fallback: v.is_fallback,
        }
      : null;
    trace.push({
      layer: "ASSET",
      key: k,
      resolved_from: (v?.resolved_via?.toUpperCase() as any) ?? "MISSING",
      ok: !!v && !!v.url,
    });
  }

  // Text blocks — composed from profile config.
  const textBlockCodes = uniq([
    ...(asArray(communicationProfile?.config?.["text_block_codes"])),
    ...(asArray(documentProfile?.config?.["text_block_codes"])),
  ]);
  const textBlocks = textBlockCodes.length
    ? await resolveTextBlocks(textBlockCodes as string[])
    : {};
  for (const [k, v] of Object.entries(textBlocks)) {
    trace.push({
      layer: "TEXT_BLOCK",
      key: k,
      resolved_from: v ? v.resolved_via : "MISSING",
      ok: !!v && !v.is_fallback,
    });
  }

  const channels = (req.channels?.length
    ? req.channels
    : (template?.channels?.length ? template.channels : DEFAULT_CHANNELS)) as DeliveryChannel[];

  return {
    context,
    communicationProfile,
    documentProfile,
    template,
    assets,
    textBlocks,
    channels,
    trace,
  };
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
