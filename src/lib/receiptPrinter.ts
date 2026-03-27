/**
 * Centralized Receipt Printer
 * Fetches the configured HTML receipt template from payment_module_config,
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

/**
 * Fetch the HTML receipt template from the database
 */
async function fetchReceiptTemplate(): Promise<string> {
  const { data, error } = await supabase
    .from('payment_module_config')
    .select('config_value')
    .eq('config_key', 'receipt_template')
    .single();
  if (error || !data) throw new Error('Receipt template not configured. Please configure it in Payment Module Configuration → Receipt tab.');
  const val = data.config_value as any;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.html_template) return val.html_template;
  throw new Error('Receipt template format is invalid. Please reconfigure it in Payment Module Configuration → Receipt tab.');
}

/**
 * Fetch all data needed to render a receipt
 */
async function fetchReceiptData(paymentId: number) {
  const [headerRes, receiptRes, linesRes, ptRes, mopRes] = await Promise.all([
    supabase.from('cn_payment_header').select('*').eq('payment_id', paymentId).single(),
    supabase.from('cn_receipt').select('*').eq('payment_id', paymentId).maybeSingle(),
    supabase.from('cn_payment').select('*').eq('payment_id', paymentId).order('payment_sequence_no'),
    supabase.from('tb_payment_type').select('payment_code, payment_type_description, fund_code'),
    supabase.from('tb_method_of_payment').select('mop_code, short_description'),
  ]);

  const header = headerRes.data as any;
  const receipt = receiptRes.data as any;
  const paymentLines = (linesRes.data || []) as any[];
  const ptTypes = (ptRes.data || []) as any[];
  const mopTypes = (mopRes.data || []) as any[];

  if (!header) throw new Error(`Payment header #${paymentId} not found.`);

  // Resolve payer name
  let payerName = header.payer_id || '';
  let payerAddress = '';
  let payerSSN = '';

  if (header.payer_type === 'ER') {
    const { data: er } = await supabase
      .from('er_master')
      .select('name, maddr1, maddr2')
      .eq('regno', header.payer_id)
      .maybeSingle();
    if (er) {
      payerName = (er as any).name || header.payer_id;
      payerAddress = [(er as any).maddr1, (er as any).maddr2].filter(Boolean).join('<br/>');
    }
  } else if (header.payer_type === 'SE' || header.payer_type === 'IP') {
    const { data: ip } = await supabase
      .from('ip_master')
      .select('firstname, surname, mail_addr1, mail_addr2')
      .eq('ssn', header.payer_id)
      .maybeSingle();
    if (ip) {
      payerName = [(ip as any).firstname, (ip as any).surname].filter(Boolean).join(' ') || header.payer_id;
      payerAddress = [(ip as any).mail_addr1, (ip as any).mail_addr2].filter(Boolean).join('<br/>');
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

  // Aggregate by fund
  const fundTotals: Record<string, number> = {};
  paymentLines.forEach((line: any) => {
    const fundCode = ptMap[line.payment_code]?.fund || line.fund_code || 'OT';
    const fundLabel = FUND_LABELS[fundCode] || fundCode;
    fundTotals[fundLabel] = (fundTotals[fundLabel] || 0) + (line.payment_amount || 0);
  });

  // Aggregate by MOP
  const mopTotals: Record<string, number> = {};
  paymentLines.forEach((line: any) => {
    const mopLabel = mopMap[line.mop_code] || line.mop_code;
    mopTotals[mopLabel] = (mopTotals[mopLabel] || 0) + (line.payment_amount || 0);
  });

  // Receipt status
  const statusMap: Record<string, string> = { O: 'Original', R: 'Reprint', C: 'Cancelled' };
  const receiptStatus = receipt ? (statusMap[receipt.status || 'O'] || receipt.status) : 'Original';

  const receiptTotal = receipt?.receipt_total || paymentLines.reduce((s: number, l: any) => s + (l.payment_amount || 0), 0);

  const dateReceived = header.date_received
    ? format(new Date(header.date_received), 'dd-MMM-yyyy')
    : format(new Date(), 'dd-MMM-yyyy');

  // Build fund rows HTML
  const fundRowsHtml = Object.entries(fundTotals)
    .map(([fund, amount]) => `<tr><td>${fund}</td><td>$${Number(amount).toFixed(2)}</td></tr>`)
    .join('\n  ');

  // Build MOP rows HTML
  const mopRowsHtml = Object.entries(mopTotals)
    .map(([mop, amount]) => `<tr><td>${mop}</td><td>$${Number(amount).toFixed(2)}</td></tr>`)
    .join('\n  ');

  // Get period from first payment line
  const period = paymentLines[0]?.period
    ? format(new Date(paymentLines[0].period), 'MM/yyyy')
    : '';

  return {
    '{{org_name}}': 'Social Security Board\nSt. Kitts and Nevis',
    '{{status}}': receiptStatus,
    '{{cashier_name}}': cashierName,
    '{{payer_name}}': payerName,
    '{{payer_id}}': header.payer_id || '',
    '{{payer_address}}': payerAddress,
    '{{payer_ssn}}': payerSSN,
    '{{payer_type}}': header.payer_type || '',
    '{{date_received}}': dateReceived,
    '{{receipt_number}}': receipt?.receipt_number || String(receipt?.receipt_id || ''),
    '{{receipt_id}}': '', // deprecated — no longer used in templates
    '{{receipt_total}}': Number(receiptTotal).toFixed(2),
    '{{payment_id}}': String(paymentId),
    '{{batch_number}}': header.batch_number || '',
    '{{fund_rows}}': fundRowsHtml,
    '{{mop_rows}}': mopRowsHtml,
    '{{print_date}}': format(new Date(), 'dd-MMM-yyyy HH:mm:ss'),
    '{{period}}': period,
    '{{remarks}}': header.remarks || '',
  };
}

/**
 * Main entry point: print a receipt by payment_id.
 * Fetches the HTML template, resolves all placeholders, and opens a print window.
 */
export async function printConfiguredReceipt(paymentId: number): Promise<void> {
  const [templateHtml, placeholders] = await Promise.all([
    fetchReceiptTemplate(),
    fetchReceiptData(paymentId),
  ]);

  // Replace all placeholders in the HTML template
  let resolvedHtml = templateHtml;
  for (const [key, value] of Object.entries(placeholders)) {
    resolvedHtml = resolvedHtml.split(key).join(value);
  }

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups for this site.');
  }
  printWindow.document.write(resolvedHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
