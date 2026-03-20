/**
 * Centralized Receipt Printer
 * Fetches the configured receipt template from payment_module_config,
 * resolves placeholders with real payment data, and opens a print window.
 */
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// ── Fund labels ──
const FUND_LABELS: Record<string, string> = {
  SS: 'Social Security',
  LV: 'Levy',
  PE: 'Severance / PE',
  EI: 'Employment Injury',
  VO: 'Voluntary',
  OT: 'Other',
};

export interface ReceiptPrintData {
  payment_id: number;
  receipt_id?: number;
  receipt_number?: string;
}

interface ReceiptTemplate {
  header: { org_name: string; show_org_name: boolean };
  body_sections: Array<{ key: string; label: string; enabled: boolean }>;
  footer: { disclaimer: string; show_disclaimer: boolean };
  print_settings: { paper_width_mm: number; font_size_pt: number; font_family: string };
}

/**
 * Fetch the receipt template from the database
 */
async function fetchReceiptTemplate(): Promise<ReceiptTemplate> {
  const { data, error } = await supabase
    .from('payment_module_config')
    .select('config_value')
    .eq('config_key', 'receipt_template')
    .single();
  if (error || !data) throw new Error('Receipt template not configured. Please configure it in Payment Module Configuration → Receipt tab.');
  return data.config_value as unknown as ReceiptTemplate;
}

/**
 * Fetch all data needed to render a receipt
 */
async function fetchReceiptData(paymentId: number) {
  const [
    { data: header },
    { data: receipt },
    { data: paymentLines },
    { data: ptTypes },
    { data: mopTypes },
    { data: bankCodes },
  ] = await Promise.all([
    supabase.from('cn_payment_header').select('*').eq('payment_id', paymentId).single(),
    supabase.from('cn_receipt').select('*').eq('payment_id', paymentId).maybeSingle(),
    supabase.from('cn_payment').select('*').eq('payment_id', paymentId).order('payment_sequence_no'),
    supabase.from('tb_payment_type').select('payment_code, payment_type_description, fund_code'),
    supabase.from('tb_method_of_payment').select('mop_code, short_description'),
    supabase.from('tb_bank_code').select('bank_code, name'),
  ]);

  if (!header) throw new Error(`Payment header #${paymentId} not found.`);

  // Resolve payer name
  let payerName = header.payer_id || '';
  let payerAddress = '';
  let payerSSN = '';

  if (header.payer_type === 'ER') {
    const { data: er } = await supabase
      .from('er_master')
      .select('name, maddr1, maddr2')
      .eq('regno', (header as any).payer_id)
      .maybeSingle();
    if (er) {
      payerName = (er as any).name || header.payer_id;
      payerAddress = [(er as any).maddr1, (er as any).maddr2].filter(Boolean).join('\n');
    }
  } else if (header.payer_type === 'SE' || header.payer_type === 'IP') {
    const { data: ip } = await supabase
      .from('ip_master')
      .select('firstname, surname, mail_addr1, mail_addr2')
      .eq('ssn', (header as any).payer_id)
      .maybeSingle();
    if (ip) {
      payerName = [(ip as any).firstname, (ip as any).surname].filter(Boolean).join(' ') || header.payer_id;
      payerAddress = [(ip as any).mail_addr1, (ip as any).mail_addr2].filter(Boolean).join('\n');
      payerSSN = header.payer_id;
    }
  }

  // Resolve cashier name from batch
  let cashierName = '';
  if (header.batch_number) {
    const { data: batchRow } = await supabase
      .from('cn_batch')
      .select('entered_by')
      .eq('batch_number', header.batch_number)
      .maybeSingle();
    if (batchRow?.entered_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_code', batchRow.entered_by.trim())
        .maybeSingle();
      cashierName = profile?.full_name || batchRow.entered_by;
    }
  }

  // Build lookup maps
  const ptMap: Record<string, { desc: string; fund: string }> = {};
  ptTypes?.forEach((pt: any) => {
    ptMap[pt.payment_code] = { desc: pt.payment_type_description || pt.payment_code, fund: pt.fund_code || '' };
  });
  const mopMap: Record<string, string> = {};
  mopTypes?.forEach((m: any) => { mopMap[m.mop_code] = m.short_description || m.mop_code; });
  const bankMap: Record<string, string> = {};
  bankCodes?.forEach((b: any) => { bankMap[(b.bank_code || '').trim()] = b.name || b.bank_code; });

  // Aggregate by fund
  const fundTotals: Record<string, number> = {};
  (paymentLines || []).forEach((line: any) => {
    const fundCode = ptMap[line.payment_code]?.fund || line.fund_code || 'OT';
    const fundLabel = FUND_LABELS[fundCode] || fundCode;
    fundTotals[fundLabel] = (fundTotals[fundLabel] || 0) + (line.payment_amount || 0);
  });

  // Aggregate by MOP
  const mopTotals: Record<string, number> = {};
  (paymentLines || []).forEach((line: any) => {
    const mopLabel = mopMap[line.mop_code] || line.mop_code;
    mopTotals[mopLabel] = (mopTotals[mopLabel] || 0) + (line.payment_amount || 0);
  });

  // Receipt status
  const statusMap: Record<string, string> = { O: 'Original', R: 'Reprint', C: 'Cancelled' };
  const receiptStatus = receipt ? (statusMap[receipt.status || 'O'] || receipt.status) : 'Original';

  const receiptTotal = receipt?.receipt_total || (paymentLines || []).reduce((s: number, l: any) => s + (l.payment_amount || 0), 0);

  const dateReceived = header.date_received
    ? format(new Date(header.date_received), 'dd-MMM-yyyy')
    : format(new Date(), 'dd-MMM-yyyy');

  return {
    payerName,
    payerAddress,
    payerSSN,
    payerType: header.payer_type,
    payerId: header.payer_id,
    cashierName,
    receiptId: receipt?.receipt_id,
    receiptNumber: receipt?.receipt_number || String(receipt?.receipt_id || ''),
    receiptStatus,
    receiptTotal,
    dateReceived,
    fundTotals,
    mopTotals,
  };
}

/**
 * Build HTML content from template + data
 */
function buildReceiptHTML(template: ReceiptTemplate, data: Awaited<ReturnType<typeof fetchReceiptData>>): string {
  const { print_settings: ps } = template;
  const widthPx = Math.round((ps.paper_width_mm / 25.4) * 96); // mm to px at 96dpi

  const sectionEnabled = (key: string) => {
    const s = template.body_sections.find(b => b.key === key);
    return s ? s.enabled : false;
  };
  const sectionLabel = (key: string) => {
    const s = template.body_sections.find(b => b.key === key);
    return s?.label || '';
  };

  let bodyHTML = '';

  // Status
  if (sectionEnabled('status_line')) {
    bodyHTML += `<div style="margin-top:8px;">Status: ${data.receiptStatus}</div>`;
  }

  // Cashier
  if (sectionEnabled('cashier_line')) {
    bodyHTML += `<div>${sectionLabel('cashier_line')}: ${data.cashierName}</div>`;
  }

  // Received from
  if (sectionEnabled('received_from')) {
    bodyHTML += `<div style="margin-top:10px;"><u>${sectionLabel('received_from')}:</u></div>`;
    bodyHTML += `<div style="padding-left:8px;">${data.payerName}</div>`;
  }

  // Address
  if (sectionEnabled('payer_address') && data.payerAddress) {
    const lines = data.payerAddress.split('\n').map((l: string) => `<div style="padding-left:8px;">${l}</div>`).join('');
    bodyHTML += lines;
  }

  // SSN
  if (sectionEnabled('ssn_line') && data.payerSSN) {
    bodyHTML += `<div style="margin-top:10px;">${sectionLabel('ssn_line')}: ${data.payerSSN}</div>`;
  }

  // Date
  if (sectionEnabled('date_line')) {
    bodyHTML += `<div style="margin-top:10px;">${sectionLabel('date_line')}: ${data.dateReceived}</div>`;
  }

  // Receipt #
  if (sectionEnabled('receipt_number')) {
    bodyHTML += `<div>${sectionLabel('receipt_number')}:  ${data.receiptNumber}</div>`;
  }

  // Total amount
  if (sectionEnabled('total_amount')) {
    bodyHTML += `<div style="margin-top:10px;">${sectionLabel('total_amount')}: $${Number(data.receiptTotal).toFixed(2)}</div>`;
  }

  // Fund table
  if (sectionEnabled('fund_table') && Object.keys(data.fundTotals).length > 0) {
    bodyHTML += `<table style="width:100%;margin-top:10px;border-collapse:collapse;">`;
    bodyHTML += `<tr><td style="border-bottom:1px solid #000;"><u>Fund</u></td><td style="border-bottom:1px solid #000;text-align:right;"><u>Amount Paid</u></td></tr>`;
    for (const [fund, amount] of Object.entries(data.fundTotals)) {
      bodyHTML += `<tr><td>${fund}</td><td style="text-align:right;">$${Number(amount).toFixed(2)}</td></tr>`;
    }
    bodyHTML += `</table>`;
  }

  // MOP table
  if (sectionEnabled('mop_table') && Object.keys(data.mopTotals).length > 0) {
    bodyHTML += `<div style="margin-top:10px;"><u>Method of payment</u></div>`;
    bodyHTML += `<table style="width:100%;border-collapse:collapse;">`;
    for (const [mop, amount] of Object.entries(data.mopTotals)) {
      bodyHTML += `<tr><td>${mop}</td><td style="text-align:right;">$${Number(amount).toFixed(2)}</td></tr>`;
    }
    bodyHTML += `</table>`;
  }

  // Header
  let headerHTML = '';
  if (template.header.show_org_name) {
    const orgLines = template.header.org_name.split('\n').map(l => `<div><b>${l}</b></div>`).join('');
    headerHTML = `<div style="text-align:center;margin-bottom:8px;text-decoration:underline;">${orgLines}</div>`;
  }

  // Footer
  let footerHTML = '';
  if (template.footer.show_disclaimer) {
    const disclaimerLines = template.footer.disclaimer.split('\n').map(l => `<div>${l}</div>`).join('');
    footerHTML = `<div style="margin-top:24px;font-size:${ps.font_size_pt - 1}pt;">${disclaimerLines}</div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<title>Receipt #${data.receiptNumber}</title>
<style>
  @page { size: ${ps.paper_width_mm}mm auto; margin: 4mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${widthPx}px;
    max-width: ${widthPx}px;
    font-family: ${ps.font_family}, monospace;
    font-size: ${ps.font_size_pt}pt;
    color: #000;
    padding: 4mm;
  }
  table { font-size: inherit; }
  td { padding: 2px 0; }
</style>
</head>
<body>
${headerHTML}
${bodyHTML}
${footerHTML}
</body>
</html>`;
}

/**
 * Main entry point: print a receipt by payment_id.
 * Opens a new window with the rendered receipt and triggers browser print.
 */
export async function printConfiguredReceipt(paymentId: number): Promise<void> {
  const [template, data] = await Promise.all([
    fetchReceiptTemplate(),
    fetchReceiptData(paymentId),
  ]);
  const html = buildReceiptHTML(template, data);

  const printWindow = window.open('', '_blank', `width=400,height=600`);
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups for this site.');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
