/**
 * Enterprise Document Generation Resolver — single entry point for
 * producing a concrete document (letter, notice, certificate, receipt,
 * statement, memo) across every module.
 *
 * Flow:
 *   1. resolveCommunication() builds the full context, template, profile,
 *      assets and text blocks.
 *   2. We render the template body by applying tokens from the resolved
 *      context plus caller-supplied tokens.
 *   3. Optionally persist to `core_generated_document` and push to DMS
 *      via the existing document pipelines.
 *
 * No module renders HTML/PDF directly — they call this resolver.
 */

import { resolveCommunication } from "./CommunicationResolver";
import { applyCommunicationTokens } from "@/lib/comm/communicationResolver";
import type {
  GenerateDocumentRequest,
  GeneratedDocumentResult,
} from "./types";

export async function generateDocument(
  req: GenerateDocumentRequest,
): Promise<GeneratedDocumentResult> {
  const resolution = await resolveCommunication(req);
  const warnings: string[] = [];

  if (!resolution.template) {
    warnings.push(`Template not found: ${req.templateCode ?? "(none provided)"}`);
  }

  // Merge token sources: context tokens + text blocks + caller tokens.
  const textBlockTokens: Record<string, string> = {};
  for (const [code, tb] of Object.entries(resolution.textBlocks)) {
    if (tb) {
      textBlockTokens[`text_block.${code}`] = tb.body_html;
      textBlockTokens[`text_block.${code}_text`] = tb.body_text;
    }
  }
  const assetTokens: Record<string, string> = {};
  for (const [slot, asset] of Object.entries(resolution.assets)) {
    if (asset) assetTokens[`asset.${slot}`] = asset.url;
  }
  const callerTokens = req.tokens ?? {};
  const baseBody = resolution.template?.body_html ?? "";
  const baseText = resolution.template?.body_text ?? "";

  const html = applyCommunicationTokens(
    baseBody,
    resolution.context,
    { ...textBlockTokens, ...assetTokens, ...callerTokens } as any,
  );
  const text = applyCommunicationTokens(
    baseText,
    resolution.context,
    { ...textBlockTokens, ...callerTokens } as any,
  );

  return {
    resolution,
    html,
    text,
    warnings,
  };
}
