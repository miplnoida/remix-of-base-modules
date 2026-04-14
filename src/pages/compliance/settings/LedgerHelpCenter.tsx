import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  BookOpen, Users, AlertTriangle, HelpCircle, Search, FileText, DollarSign,
  Shield, ArrowRight, CheckCircle2, XCircle, Clock, Phone, Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ══════════════════════════════════════════════════════════════
// ROLE-BASED SOP DATA
// ══════════════════════════════════════════════════════════════

const ROLE_SOPS = [
  {
    role: "C3 / Contributions Operator",
    icon: FileText,
    color: "text-blue-600",
    responsibilities: [
      "Finalize C3 contribution declarations",
      "Monitor unposted or failed C3 items",
      "Resolve source data issues that block posting",
      "Re-trigger posting after corrections",
    ],
    dailyTasks: [
      { step: 1, task: "Review the Posting Queue for any PENDING or FAILED items with source = C3", action: "Go to Ledger Operations → Queue Monitor → filter by C3" },
      { step: 2, task: "Identify why items failed — check the Error column for business interpretation", action: "Common issues: missing employer mapping, invalid period, duplicate record" },
      { step: 3, task: "Correct the source C3 record if needed (amend period, fix employer ID)", action: "Go to C3 Management and edit the affected submission" },
      { step: 4, task: "Re-trigger the C3 posting job for the specific employer", action: "Ledger Operations → Manual Rerun → enter Employer ID → Source = C3 → Execute" },
      { step: 5, task: "Verify that the debit row now appears in the employer statement", action: "Open Employer 360 → Statement tab → confirm contribution row exists" },
    ],
    commonFailures: [
      { error: "Employer not found in mapping", meaning: "The payer_id on the C3 record doesn't match any registered employer", action: "Verify the employer registration number is correct in the C3 submission" },
      { error: "Invalid contribution period", meaning: "The period field is empty, malformed, or in the future", action: "Edit the C3 record to correct the period field (format: YYYY-MM)" },
      { error: "Duplicate idempotency key", meaning: "This exact C3 entry was already posted — the system prevented a duplicate", action: "No action needed. This is the system protecting against double-posting." },
      { error: "Fund mapping issue", meaning: "The fund type on the C3 couldn't be mapped to a ledger fund", action: "Check that the fund code (SS, LEVY, PE) is valid on the source record" },
    ],
    warnings: [
      "Only finalized (Verified or Posted status) C3 records will be picked up by the posting job",
      "Draft or unverified C3 submissions will NOT appear in the employer statement",
      "Do not manually enter ledger rows — always use the posting job",
    ],
  },
  {
    role: "Cashier / Payment Entry User",
    icon: DollarSign,
    color: "text-emerald-600",
    responsibilities: [
      "Create payment entries and issue receipts",
      "Reconcile payment batch totals",
      "Close batch properly before handoff",
      "Ensure payments reach final status for posting",
    ],
    dailyTasks: [
      { step: 1, task: "Enter all payments into the active batch for the day", action: "Go to Cashier → Payment Entry" },
      { step: 2, task: "Issue receipts for each payment processed", action: "Receipt is generated automatically after payment submission" },
      { step: 3, task: "Reconcile batch totals at end of day", action: "Go to Cashier → Batch Management → verify totals match physical receipts" },
      { step: 4, task: "Close the batch when reconciliation is complete", action: "Click 'Close Batch' — this is required before payments can be posted to the ledger" },
      { step: 5, task: "Hand off to Supervisor / Finance for batch approval", action: "Notify supervisor that batch is ready for review and posting" },
    ],
    commonFailures: [
      { error: "Batch not yet posted", meaning: "The payment batch hasn't been closed and approved, so payments can't be posted to the ledger", action: "Complete batch reconciliation and close the batch first" },
      { error: "Payment reversal not found", meaning: "A returned payment couldn't find the original payment to reverse", action: "Verify the original payment ID and ensure it was properly posted" },
    ],
    warnings: [
      "The employer statement will NOT update from draft or incomplete batch work",
      "Payments must reach 'Verified' (A) receipt status to be eligible for ledger posting",
      "Do NOT alter posted payments without going through the formal reversal process",
      "Batch closure is the control point — until a batch is closed, its payments are not posted",
    ],
  },
  {
    role: "Supervisor / Finance Posting User",
    icon: Shield,
    color: "text-purple-600",
    responsibilities: [
      "Review closed batches for accuracy",
      "Approve / post financial batches",
      "Monitor payment posting exceptions",
      "Review returned or dishonored payments",
    ],
    dailyTasks: [
      { step: 1, task: "Review all closed batches pending approval", action: "Go to Cashier → Batch Management → filter by 'Closed' status" },
      { step: 2, task: "Confirm batch totals are balanced", action: "Check that total receipts = total payments = batch total" },
      { step: 3, task: "Approve/post the batch", action: "Click 'Post Batch' to finalize" },
      { step: 4, task: "Verify payment posting queue consumed the records", action: "Go to Ledger Operations → Queue Monitor → filter by PAYMENT source" },
      { step: 5, task: "Review any returned payments or dishonored items", action: "Go to Ledger Operations → check for REVERSAL entries or failed items" },
    ],
    commonFailures: [
      { error: "Batch imbalance detected", meaning: "Receipts don't match payment totals — cannot approve", action: "Return batch to cashier for reconciliation correction" },
      { error: "Source record missing final status", meaning: "A payment line hasn't reached the required status for posting", action: "Verify the batch was properly closed and all receipts are in 'A' status" },
    ],
    warnings: [
      "Do not approve batches that show discrepancies in totals",
      "Returned payment reversals are handled automatically by the Reversal Detection job",
      "If a reversal fails, escalate to Compliance Support for manual review",
    ],
  },
  {
    role: "Compliance / Statement Support User",
    icon: AlertTriangle,
    color: "text-amber-600",
    responsibilities: [
      "Monitor ledger posting health",
      "Review reconciliation mismatches",
      "Run employer-level rebuilds when needed",
      "Verify employer statement availability and accuracy",
      "Escalate systemic issues to Technical Support",
    ],
    dailyTasks: [
      { step: 1, task: "Check the Health Summary dashboard for any alerts", action: "Go to Ledger Operations → Health Summary. Look for non-zero Failed or Exception counts." },
      { step: 2, task: "Review nightly reconciliation results", action: "Go to Ledger Operations → Reconciliation tab. Focus on HIGH severity exceptions first." },
      { step: 3, task: "For mismatched employers, investigate source vs ledger", action: "Use the Employer 360 screen to compare source C3/payment data against ledger entries" },
      { step: 4, task: "Rebuild employer ledger if a structural mismatch exists", action: "Go to Ledger Operations → Manual Rerun tab. Follow the 7-step guided workflow." },
      { step: 5, task: "Verify the employer statement after rebuild", action: "Open the statement from Employer 360 → Statement tab. Confirm opening balance, debits, credits, and running balance are correct." },
      { step: 6, task: "Escalate systemic issues to Technical Support", action: "If multiple employers have the same failure pattern, raise a support ticket." },
    ],
    commonFailures: [
      { error: "Reconciliation mismatch remains after rerun", meaning: "Source and ledger totals still don't match after a rebuild", action: "Check if there are unfinalized C3 or payment records. If source data is correct, escalate to Technical Support." },
      { error: "Employer has source activity but no ledger rows", meaning: "C3 or payment data exists but was never posted to the ledger", action: "Run a Historical Backfill for this employer using Manual Rerun → Source = All" },
    ],
    warnings: [
      "Never manually edit ledger rows — always use the posting jobs or rebuild workflow",
      "Reconciliation runs nightly — check results each morning",
      "Statement readiness depends on ALL posting jobs running successfully",
    ],
  },
  {
    role: "Technical Support / Admin",
    icon: Shield,
    color: "text-red-600",
    responsibilities: [
      "Resolve systemic job failures",
      "Investigate mapping and configuration issues",
      "Manage retry policies and system exceptions",
      "Monitor edge function health and deployment status",
    ],
    dailyTasks: [
      { step: 1, task: "Check Job Run History for any FAILED or COMPLETED_WITH_ERRORS status", action: "Go to Ledger Posting Framework (Admin) → Job History tab" },
      { step: 2, task: "Review edge function logs for error patterns", action: "Check backend function logs for the specific job that failed" },
      { step: 3, task: "Verify job configuration in automation settings", action: "Go to Admin → Automation → Job Configuration → check LEDGER-* jobs are enabled" },
      { step: 4, task: "Re-deploy edge functions if code changes were made", action: "Use the deployment tools to redeploy affected edge functions" },
      { step: 5, task: "Clear stuck PROCESSING items from the posting queue", action: "Items stuck in PROCESSING for > 30 minutes may need manual status reset" },
    ],
    commonFailures: [
      { error: "Edge function timeout", meaning: "The posting job took too long and was killed by the runtime", action: "Reduce batch_size parameter or filter to specific employer/period" },
      { error: "Database connection error", meaning: "Backend couldn't connect to the database during job execution", action: "Check database health and retry. May indicate infrastructure issue." },
      { error: "Job has no runtime handler", meaning: "The automation job exists but the edge function is not deployed", action: "Verify the edge function exists and redeploy if needed" },
    ],
    warnings: [
      "Do not manually insert or update rows in the ce_employer_financial_ledger table",
      "All posting must go through the controlled edge function pipeline",
      "If clearing stuck queue items, always check if a concurrent job is still running",
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// HELP MANUAL SECTIONS
// ══════════════════════════════════════════════════════════════

const HELP_SECTIONS = [
  {
    id: "what-is-ledger",
    title: "1. What is the Compliance Ledger?",
    content: `The Compliance Ledger is the single source of financial truth for employer statements. It records every financial event — contributions due, payments received, penalties, interest, adjustments, and reversals — as individual ledger entries with debit and credit amounts.\n\nThink of it like a bank statement: every transaction is recorded in chronological order, and the running balance tells you exactly what an employer owes or has overpaid at any point in time.\n\nThe ledger is populated automatically by controlled posting jobs — users never edit it directly.`,
  },
  {
    id: "why-posting",
    title: "2. Why Employer Statements Depend on Posting Jobs",
    content: `Employer Statements are generated from the Compliance Ledger, NOT from the raw source tables (C3, Payments, etc.).\n\nThis means:\n• If a C3 contribution is finalized but hasn't been posted → it won't appear on the statement\n• If a payment is entered but the batch hasn't been closed → it won't appear on the statement\n• If a penalty is calculated but not yet accrued → it won't appear on the statement\n\nThe posting jobs are the bridge between source data and the statement. They run automatically on schedule, but operators must ensure source data is in the correct state for posting to work.`,
  },
  {
    id: "c3-responsibilities",
    title: "3. What C3 / Contributions Users Must Do",
    content: `C3 users are responsible for ensuring contribution declarations reach 'Verified' or 'Posted' status. Only finalized C3 records are eligible for ledger posting.\n\nKey responsibilities:\n• Complete data entry accurately (employer ID, period, fund amounts)\n• Verify C3 submissions before finalization\n• Monitor the posting queue for any C3 items that failed to post\n• Correct source data errors that block posting\n\nCommon issues:\n• Missing or incorrect employer registration number\n• Invalid period format (must be YYYY-MM)\n• Duplicate submissions for the same employer/period/fund`,
  },
  {
    id: "payment-responsibilities",
    title: "4. What Payment / Cashier Users Must Do",
    content: `Payment users must ensure payments are properly entered, receipted, and batch-closed before they can appear on employer statements.\n\nThe payment posting pipeline:\n1. Payment entered into active batch\n2. Receipt issued (status = 'A' for Verified)\n3. Batch reconciled and closed\n4. Supervisor approves/posts batch\n5. Payment posting job picks up finalized receipts\n6. Credit entry appears in compliance ledger\n7. Employer statement shows the payment\n\nIf any step is incomplete, the payment will NOT appear on the statement.`,
  },
  {
    id: "how-data-created",
    title: "5. How Statement Data Gets Created",
    content: `Statement data follows this flow:\n\nSource Event → Posting Job → Posting Queue → Compliance Ledger → Employer Statement\n\nEach posting job:\n1. Scans for new finalized source records\n2. Generates an idempotency key (prevents duplicates)\n3. Checks if the entry already exists\n4. Creates a queue entry for tracking\n5. Posts a debit or credit entry to the ledger\n6. Updates the queue entry with the result\n\nDebits increase what the employer owes (contributions, penalties, interest).\nCredits decrease what the employer owes (payments, waivers, adjustments).`,
  },
  {
    id: "identify-failures",
    title: "6. How to Identify Failed Postings",
    content: `Failed postings are visible in multiple places:\n\n1. Health Summary — the 'Failed Postings' KPI card shows the total count\n2. Queue Monitor — filter by Status = 'FAILED' to see individual items\n3. Job Status — cards with red borders indicate the last run had errors\n\nEach failed queue entry shows:\n• The source system (C3 or PAYMENT)\n• The employer ID and period\n• The error message explaining why it failed\n• The number of retry attempts\n\nMost failures are caused by source data issues that operators can fix.`,
  },
  {
    id: "safe-rerun",
    title: "7. How to Rerun Posting Safely",
    content: `The system uses idempotency keys to prevent duplicate postings. This means you can safely rerun a posting job without creating duplicate entries.\n\nTo rerun safely:\n1. Go to Ledger Operations → Manual Rerun tab\n2. Enter the Employer ID\n3. Optionally narrow to a specific period range\n4. Choose the source type (C3, Payment, or All)\n5. Enter a reason for the rerun\n6. Click 'Preview Impact' to see what would happen (dry run)\n7. Review the preview — if it shows 0 'Would Post', the data is already posted\n8. Click 'Execute Rerun' to apply\n9. Verify the employer statement after completion\n\nThe system will automatically skip any entries that already exist.`,
  },
  {
    id: "returned-payments",
    title: "8. How to Handle Returned Payments",
    content: `When a payment is returned or dishonored:\n\n1. The receipt is cancelled in the cashier system (status = 'C')\n2. The Reversal Detection job scans for cancelled receipts\n3. It finds the original PAYMENT_RECEIVED credit in the ledger\n4. It creates a REVERSAL debit entry (reversing the credit)\n5. The employer's balance increases by the reversed amount\n\nThis happens automatically. If it doesn't:\n• Check that the receipt was properly cancelled (status = 'C')\n• Check the Reversal Detection job ran successfully\n• If needed, trigger a manual run of LEDGER-REVERSAL job`,
  },
  {
    id: "penalty-mismatches",
    title: "9. How to Handle Penalty / Interest Mismatches",
    content: `Penalties and interest are posted by the Penalty Accrual job. If the amounts don't match expectations:\n\n1. Check the calculation rules in Admin → Settings → Rule Engine\n2. Verify the interest rate applied (currently 1.5% monthly)\n3. Review the employer's outstanding balance — interest is calculated on the net balance\n4. If a penalty was incorrectly applied, it can be reversed through the waiver/adjustment process\n\nNote: Penalty accrual runs nightly. Changes to rules or waivers may not reflect until the next nightly run.`,
  },
  {
    id: "when-escalate",
    title: "10. When to Escalate to Technical Support",
    content: `Escalate when:\n\n• The same error occurs for multiple employers (systemic issue)\n• A job fails repeatedly after source data correction\n• Reconciliation mismatches persist after rebuild\n• Queue items are stuck in PROCESSING for > 30 minutes\n• Edge function deployment issues\n• Database connectivity errors\n\nDo NOT escalate for:\n• Single employer data corrections (fix the source data)\n• Missing C3 or payment postings (check if source is finalized)\n• Duplicate idempotency key messages (this is the system working correctly)\n• Zero results from a dry run (data may already be posted)`,
  },
];

// ══════════════════════════════════════════════════════════════
// TROUBLESHOOTING MATRIX
// ══════════════════════════════════════════════════════════════

const TROUBLESHOOTING = [
  { error: "Employer not found", interpretation: "The employer ID in the source record doesn't match any registered employer", userAction: "Verify the employer registration number in the source C3/payment record", escalate: "Only if the employer is registered but still not recognized", expectedResult: "After correction, rerun will create the ledger entry" },
  { error: "Invalid period", interpretation: "The contribution/payment period is empty, malformed, or unrealistic", userAction: "Edit the source record to provide a valid period (YYYY-MM format)", escalate: "If the period is correct but still rejected", expectedResult: "Entry will post with the corrected period" },
  { error: "Duplicate idempotency key", interpretation: "This exact entry already exists in the ledger — the system prevented a duplicate", userAction: "No action needed. This is the system working correctly.", escalate: "Never — this is expected behavior", expectedResult: "Entry is safely skipped" },
  { error: "Batch not yet posted", interpretation: "The payment batch hasn't been closed/approved, so payments can't be posted", userAction: "Complete batch reconciliation and close the batch", escalate: "If batch is closed but still shows this error", expectedResult: "After batch closure, payment posting job will pick it up" },
  { error: "Source record missing final status", interpretation: "The C3 or payment hasn't reached finalized status (V/P for C3, A for receipts)", userAction: "Complete the finalization workflow for the source record", escalate: "If the record appears finalized but posting fails", expectedResult: "Once finalized, next posting job run will process it" },
  { error: "Payment reversal not found", interpretation: "A cancelled receipt couldn't be matched to an original ledger entry", userAction: "Verify the original payment was posted to the ledger first", escalate: "If original payment exists in ledger but reversal still fails", expectedResult: "Reversal entry created, employer balance adjusted" },
  { error: "Reconciliation mismatch remains after rerun", interpretation: "Source and ledger totals still don't agree after a full rebuild", userAction: "Check for unfinalized source records not yet eligible for posting", escalate: "Yes — if all source data is finalized and totals still differ", expectedResult: "Technical team investigates mapping or calculation issue" },
  { error: "Edge function timeout", interpretation: "The job took too long to complete", userAction: "Try running with a smaller batch or filtering by employer", escalate: "Yes — if timeouts persist with small batches", expectedResult: "Job completes within time limit" },
  { error: "Queue item stuck in PROCESSING", interpretation: "A previous job run may have been interrupted", userAction: "Wait 30 minutes. If still stuck, escalate.", escalate: "Yes — after 30 minutes of no progress", expectedResult: "Item cleared and available for retry" },
];

// ══════════════════════════════════════════════════════════════
// ESCALATION MATRIX
// ══════════════════════════════════════════════════════════════

const ESCALATION_MATRIX = [
  { role: "C3 Operator", escalatesTo: "Compliance Support", when: "Source data is correct but posting still fails", sla: "Same day" },
  { role: "Cashier", escalatesTo: "Supervisor / Finance", when: "Batch reconciliation discrepancy", sla: "Same day" },
  { role: "Supervisor", escalatesTo: "Compliance Support", when: "Payment posting exceptions after batch approval", sla: "Next business day" },
  { role: "Compliance Support", escalatesTo: "Technical Support", when: "Systemic failures, repeated mismatches, infrastructure issues", sla: "4 hours" },
  { role: "Technical Support", escalatesTo: "System Administrator", when: "Database issues, deployment failures, data corruption", sla: "2 hours" },
];

// ══════════════════════════════════════════════════════════════
// PDF EXPORT
// ══════════════════════════════════════════════════════════════

function exportSOPToPDF() {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Ledger Posting Operations — SOP & Help Manual", 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, y);
  doc.text("CONFIDENTIAL — For Internal Use Only", 14, y + 5);
  y += 15;

  // Help Manual
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PART 1: HELP MANUAL", 14, y);
  y += 8;

  for (const section of HELP_SECTIONS) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(section.content.replace(/\n/g, " "), 180);
    for (const line of lines) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(line, 14, y);
      y += 4.5;
    }
    y += 4;
  }

  // SOPs by Role
  doc.addPage();
  y = 20;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PART 2: STANDARD OPERATING PROCEDURES BY ROLE", 14, y);
  y += 10;

  for (const sop of ROLE_SOPS) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(sop.role, 14, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Daily Tasks:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    for (const task of sop.dailyTasks) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${task.step}. ${task.task}`, 18, y);
      y += 4;
      doc.setTextColor(100);
      doc.text(`   Action: ${task.action}`, 18, y);
      doc.setTextColor(0);
      y += 5;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Warnings:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    for (const warning of sop.warnings) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(`⚠ ${warning}`, 18, y);
      y += 5;
    }
    y += 6;
  }

  // Troubleshooting
  doc.addPage();
  y = 20;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PART 3: TROUBLESHOOTING MATRIX", 14, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Error", "Meaning", "User Action", "Escalate?", "Expected Result"]],
    body: TROUBLESHOOTING.map(t => [t.error, t.interpretation, t.userAction, t.escalate, t.expectedResult]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [41, 98, 255], fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 35 },
      2: { cellWidth: 40 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
    },
  });

  // Escalation Matrix
  doc.addPage();
  y = 20;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PART 4: ESCALATION MATRIX", 14, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [["Role", "Escalates To", "When", "SLA"]],
    body: ESCALATION_MATRIX.map(e => [e.role, e.escalatesTo, e.when, e.sla]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 98, 255] },
  });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${totalPages}`, 14, 290);
    doc.text("Ledger Posting SOP — Confidential", 105, 290, { align: "center" });
    doc.text(new Date().toLocaleDateString(), 196, 290, { align: "right" });
    doc.setTextColor(0);
  }

  doc.save("Ledger_Posting_SOP_Manual.pdf");
}

// ══════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════

function SOPTab() {
  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="space-y-2">
        {ROLE_SOPS.map((sop, idx) => (
          <AccordionItem key={idx} value={`sop-${idx}`} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <sop.icon className={`h-5 w-5 ${sop.color}`} />
                <div className="text-left">
                  <div className="font-medium">{sop.role}</div>
                  <div className="text-xs text-muted-foreground">{sop.responsibilities.length} responsibilities • {sop.dailyTasks.length} daily tasks</div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              {/* Responsibilities */}
              <div>
                <h4 className="text-sm font-medium mb-2">Key Responsibilities</h4>
                <ul className="space-y-1">
                  {sop.responsibilities.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Daily Tasks */}
              <div>
                <h4 className="text-sm font-medium mb-2">Daily Operating Procedure</h4>
                <div className="space-y-3">
                  {sop.dailyTasks.map(task => (
                    <div key={task.step} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">{task.step}</div>
                      <div>
                        <div className="text-sm font-medium">{task.task}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <ArrowRight className="h-3 w-3" /> {task.action}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Failures */}
              {sop.commonFailures.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Common Failure Reasons</h4>
                  <div className="space-y-2">
                    {sop.commonFailures.map((f, i) => (
                      <div key={i} className="border rounded p-2 text-xs space-y-1">
                        <div className="font-medium text-red-600">{f.error}</div>
                        <div className="text-muted-foreground">{f.meaning}</div>
                        <div className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" /> {f.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {sop.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 space-y-1.5">
                  <h4 className="text-sm font-medium text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Important Warnings
                  </h4>
                  {sop.warnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-700">⚠ {w}</div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function HelpManualTab() {
  const [search, setSearch] = useState("");
  const filtered = HELP_SECTIONS.filter(s =>
    search === "" || s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search help topics..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <ScrollArea className="h-[550px]">
        <Accordion type="single" collapsible className="space-y-2">
          {filtered.map(section => (
            <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2 text-left">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {section.content}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  );
}

function TroubleshootingTab() {
  const [search, setSearch] = useState("");
  const filtered = TROUBLESHOOTING.filter(t =>
    search === "" || t.error.toLowerCase().includes(search.toLowerCase()) || t.interpretation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by error message..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Error Message</TableHead>
              <TableHead>What It Means</TableHead>
              <TableHead>What To Do</TableHead>
              <TableHead>Escalate?</TableHead>
              <TableHead>Expected Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-xs text-red-600">{t.error}</TableCell>
                <TableCell className="text-xs">{t.interpretation}</TableCell>
                <TableCell className="text-xs text-emerald-700">{t.userAction}</TableCell>
                <TableCell className="text-xs">{t.escalate}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.expectedResult}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

function EscalationTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Escalation Path</CardTitle>
          <CardDescription>Follow this escalation chain when issues cannot be resolved at your level.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 flex-wrap py-4">
            {["C3 Operator", "Cashier", "Supervisor", "Compliance Support", "Technical Support", "System Admin"].map((role, i, arr) => (
              <div key={role} className="flex items-center gap-2">
                <div className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                  i < 2 ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30" :
                  i < 4 ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30" :
                  "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30"
                }`}>{role}</div>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Escalates To</TableHead>
            <TableHead>When</TableHead>
            <TableHead>SLA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ESCALATION_MATRIX.map((e, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium text-sm">{e.role}</TableCell>
              <TableCell className="text-sm">{e.escalatesTo}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{e.when}</TableCell>
              <TableCell><Badge variant="outline">{e.sla}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════

export default function LedgerHelpCenter() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ledger Posting — Help & SOP Center</h1>
          <p className="text-sm text-muted-foreground">
            Role-based standard operating procedures, help manual, troubleshooting guide, and escalation matrix.
          </p>
        </div>
        <Button onClick={exportSOPToPDF}>
          <Download className="h-4 w-4 mr-2" /> Download PDF Manual
        </Button>
      </div>

      <Tabs defaultValue="sop" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="sop" className="gap-1.5"><Users className="h-3.5 w-3.5" /> SOPs by Role</TabsTrigger>
          <TabsTrigger value="help" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Help Manual</TabsTrigger>
          <TabsTrigger value="troubleshoot" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Troubleshooting</TabsTrigger>
          <TabsTrigger value="escalation" className="gap-1.5"><Phone className="h-3.5 w-3.5" /> Escalation Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="sop"><SOPTab /></TabsContent>
        <TabsContent value="help"><HelpManualTab /></TabsContent>
        <TabsContent value="troubleshoot"><TroubleshootingTab /></TabsContent>
        <TabsContent value="escalation"><EscalationTab /></TabsContent>
      </Tabs>
    </div>
  );
}
