/**
 * CH-SIMPLE-P3C — Preview & Approval service contract + repo governance.
 *
 * Verifies the frontend service surface is a plain forward of the server
 * RPCs and does not compute anything authoritative locally, and that no
 * production code re-introduces the legacy `preview_confirmed` /
 * `preview_shown` positive-authorisation pattern.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as svc from "@/platform/communication-hub/previewApprovalService";

const ROOT = path.resolve(__dirname, "../../../..");

describe("CH-SIMPLE-P3C service contract", () => {
  it("exposes the canonical preview/approval operations only", () => {
    expect(typeof svc.preparePreview).toBe("function");
    expect(typeof svc.approvePreview).toBe("function");
    expect(typeof svc.validatePreviewApproval).toBe("function");
    expect(typeof svc.revokePreviewApproval).toBe("function");
    expect(typeof svc.fetchPreviewSnapshot).toBe("function");
    expect(typeof svc.reservePreviewApproval).toBe("function");
    expect(typeof svc.consumePreviewApproval).toBe("function");
    expect(typeof svc.releasePreviewReservation).toBe("function");
  });

  it("frontend service does not compute an authoritative allowed/hash", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "src/platform/communication-hub/previewApprovalService.ts"),
      "utf8",
    );
    // No client-side allowed/authoritative decision
    expect(src).not.toMatch(/allowed\s*=\s*true/);
    // No client-side md5/sha calculation of content
    expect(src).not.toMatch(/\bmd5\s*\(/i);
    expect(src).not.toMatch(/createHash\s*\(/);
  });
});

describe("CH-SIMPLE-P3C legacy preview-flag governance", () => {
  const EXEMPT = [
    /(^|\/)node_modules(\/|$)/,
    /(^|\/)__tests__(\/|$)/,
    /\.test\.[tj]sx?$/,
    /\.spec\.[tj]sx?$/,
    /src\/integrations\/supabase\/types\.ts$/,
    /supabase\/migrations\//,
    /supabase\/functions\//, // compat parsing lives here — never a positive authoriser
    /src\/platform\/communication-hub\/sendDecisionService\.ts$/, // typed forward only
    /docs\//,
    /scripts\//,
    /src\/pages\/admin\/communicationHub\/controlCenter\/PreviewApprovalPanel\.tsx$/,
    /previewApprovalService\.ts$/,
  ];

  function walk(dir: string, acc: string[] = []): string[] {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const rel = path.relative(ROOT, abs);
      if (EXEMPT.some((r) => r.test(rel))) continue;
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) walk(abs, acc);
      else if (/\.(ts|tsx)$/.test(name)) acc.push(abs);
    }
    return acc;
  }

  it("no production file uses preview_confirmed/preview_shown as a positive authoriser", () => {
    const files = walk(path.join(ROOT, "src"));
    // Forbidden: any assignment like `authorized = preview_confirmed`, or
    // `if (preview_confirmed) { allow(...) }`, or `preview_confirmed: true` sent
    // as an authorization argument inside canonical send-decision payload.
    const FORBIDDEN: RegExp[] = [
      /authoriz\w*\s*=\s*.*preview_confirmed/i,
      /allow\w*\s*=\s*.*preview_shown/i,
      /preview_confirmed\s*:\s*true[^,\n}]{0,60}(evaluate_comm_hub_send_decision|controlled_live|manual_live)/i,
    ];
    const hits: Array<{ file: string; line: string }> = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      src.split(/\r?\n/).forEach((line, i) => {
        for (const r of FORBIDDEN) {
          if (r.test(line)) hits.push({ file: path.relative(ROOT, f), line: `${i + 1}: ${line.trim()}` });
        }
      });
    }
    expect(hits).toEqual([]);
  });
});
