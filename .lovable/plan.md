# Compliance Module Deep-Dive + PDF Deliverables

Documentation/artifact task only — no app code or DB changes.

## Step 1 — Write Mermaid source

Create `/mnt/documents/Compliance_Workflow.mmd` with a `flowchart TD` covering:

```text
Triggers (Auto / Event / Manual / Scheduled)
  -> Rule Engine pipeline (ce_rules, fn_ce_score_candidates_v3, ce-breach-monitor)
  -> Validation (active policy, employer posture, parity, arrangements, escalation prereqs)
  -> Violation detected? --No--> Close / Monitor
                       --Yes-> Auto-create ce_violations (numbered via policy)
  -> Open ce_case + assign
  -> Issue notices (ce_notices)
  -> Optional payment arrangement (ce_payment_arrangements + installments)
  -> Daily breach monitor --Cured--> Resume
                          --Defaulted--> Field ops (inspector visit)
  -> Escalation prereqs met? --No--> Loop back to notices/field
                              --Yes--> Snapshot + create legal_case
  -> Compliance case = ESCALATED, Legal module owns outcome
```

## Step 2 — Render PDFs

Script `/tmp/render_mmd_to_pdf.py`:

- Primary path: `npx -y @mermaid-js/mermaid-cli mmdc -i <in.mmd> -o <out.pdf> -b white --pdfFit`
- Fallback: render Mermaid in headless HTML via Playwright if mmdc PDF output misbehaves
- Inputs: `/mnt/documents/Compliance_Workflow.mmd`, existing `/mnt/documents/SSB_Workflow.mmd`
- Outputs: `/mnt/documents/Compliance_Workflow.pdf`, `/mnt/documents/SSB_Workflow.pdf`

If `SSB_Workflow.mmd` is not present in `/mnt/documents/`, search prior chat artifacts / regenerate from chat history before rendering.

## Step 3 — QA

`pdftoppm -r 150 <pdf> /tmp/qa_<name>` then view each JPEG. Check for: clipped nodes, overlap, missing edges, blank pages. Re-render with adjusted size (`-w 2000`) if needed.

## Step 4 — Chat response

Inline written explanation with the 5 sections (Triggers, Validations, Detection, Actions, Legal handover) grounded in `ce_*` tables and services (`paymentReconciliationService`, `breachEvaluationService`, `escalationPrerequisiteService`, `complianceSummaryService`, `noticeService`, `compliancePolicyService`, `ViolationType`, `ce-breach-monitor`, `fn_ce_score_candidates_v3`, weekly planner).

Emit three artifact tags:

- `Compliance_Workflow.mmd` (text/vnd.mermaid)
- `Compliance_Workflow.pdf` (application/pdf)
- `SSB_Workflow.pdf` (application/pdf)

## Risks / Notes

- If `SSB_Workflow.mmd` cannot be located, will recover content from chat history; flag to user if regeneration was needed.
- Mermaid CLI requires Chromium; first `npx` invocation may take 30–60s.  
  
  
  
Must read :- dont chnage any codebase and the database related things
- &nbsp;