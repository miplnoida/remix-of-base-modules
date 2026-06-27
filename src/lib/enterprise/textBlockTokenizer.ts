/**
 * Expand `{{text_block.CODE}}` and `{{text_block.CODE_text}}` markers in
 * any body string by resolving the referenced `core_text_block` rows
 * through the enterprise text-block resolver (parent-chain aware).
 *
 * Modules and the template designer call this whenever they want to
 * preview / persist a body that embeds other reusable text blocks.
 */
import { resolveTextBlocks } from "./resolvers/textBlockResolver";

const RE = /\{\{\s*text_block\.([A-Z0-9_]+?)(_text)?\s*\}\}/g;

export async function expandTextBlockTokens(body: string): Promise<string> {
  if (!body) return body;
  const codes = new Set<string>();
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(body)) !== null) codes.add(m[1]);
  if (!codes.size) return body;

  const resolved = await resolveTextBlocks(Array.from(codes));
  return body.replace(RE, (_full, code: string, textSuffix?: string) => {
    const tb = resolved[code];
    if (!tb) return "";
    return textSuffix ? tb.body_text : tb.body_html;
  });
}

export function extractTextBlockCodes(body: string): string[] {
  if (!body) return [];
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(body)) !== null) out.add(m[1]);
  return Array.from(out);
}
