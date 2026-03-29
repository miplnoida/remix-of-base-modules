/**
 * Centralized Invoice Printer
 * Fetches the configured HTML invoice template from payment_module_config,
 * resolves placeholders with real invoice data, and opens a print window.
 */
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

/**
 * Fetch the HTML invoice template from the database
 */
async function fetchInvoiceTemplate(): Promise<string> {
  const { data, error } = await supabase
    .from('payment_module_config')
    .select('config_value')
    .eq('config_key', 'invoice_template')
    .single();
  if (error || !data) throw new Error('Invoice template not configured. Please configure it in Payment Module Configuration → Receipt & Invoice tab.');
  const val = data.config_value as any;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.html_template) return val.html_template;
  throw new Error('Invoice template format is invalid. Please reconfigure it.');
}

/**
 * Fetch all data needed to render an invoice
 */
async function fetchInvoiceData(invoiceId: number) {
  const [invoiceRes, linesRes, ptRes, statusRes] = await Promise.all([
    supabase.from('cn_invoices').select('*').eq('id', invoiceId).single(),
    supabase.from('cn_invoice_lines').select('*').eq('invoice_id', invoiceId).order('sort_order'),
    supabase.from('tb_payment_type').select('payment_code, payment_type_description'),
    supabase.from('tb_invoice_status').select('code, description'),
  ]);

  const invoice = invoiceRes.data as any;
  const invoiceLines = (linesRes.data || []) as any[];
  const ptTypes = (ptRes.data || []) as any[];
  const statuses = (statusRes.data || []) as any[];

  if (!invoice) throw new Error(`Invoice #${invoiceId} not found.`);

  // Build lookup maps
  const ptMap: Record<string, string> = {};
  ptTypes?.forEach((pt: any) => {
    ptMap[pt.payment_code] = pt.payment_type_description || pt.payment_code;
  });

  const statusMap: Record<string, string> = {};
  statuses?.forEach((s: any) => {
    statusMap[s.code] = s.description || s.code;
  });

  // Resolve payer name
  let payerName = invoice.payer_name || invoice.payer_id || '';
  let payerAddress = invoice.payer_address || '';
  let payerEmail = invoice.payer_email || '';
  let payerPhone = invoice.payer_phone || '';

  if (!payerName && invoice.payer_type === 'ER') {
    const { data: er } = await supabase
      .from('er_master')
      .select('name, maddr1, maddr2')
      .eq('regno', invoice.payer_id)
      .maybeSingle();
    if (er) {
      payerName = (er as any).name || invoice.payer_id;
      if (!payerAddress) {
        payerAddress = [(er as any).maddr1, (er as any).maddr2].filter(Boolean).join('<br/>');
      }
    }
  } else if (!payerName && (invoice.payer_type === 'SE' || invoice.payer_type === 'IP')) {
    const { data: ip } = await supabase
      .from('ip_master')
      .select('firstname, surname, mail_addr1, mail_addr2')
      .eq('ssn', invoice.payer_id)
      .maybeSingle();
    if (ip) {
      payerName = [(ip as any).firstname, (ip as any).surname].filter(Boolean).join(' ') || invoice.payer_id;
      if (!payerAddress) {
        payerAddress = [(ip as any).mail_addr1, (ip as any).mail_addr2].filter(Boolean).join('<br/>');
      }
    }
  }

  // Resolve invoice type description
  let invoiceTypeDesc = invoice.invoice_type || '';
  {
    const { data: itRow } = await supabase
      .from('tb_invoice_types')
      .select('description')
      .eq('code', invoice.invoice_type)
      .maybeSingle();
    if (itRow) invoiceTypeDesc = (itRow as any).description || invoice.invoice_type;
  }

  // Resolve payment source description
  let paymentSourceDesc = invoice.payment_source || '';
  {
    const { data: psRow } = await supabase
      .from('tb_payment_sources')
      .select('description')
      .eq('code', invoice.payment_source)
      .maybeSingle();
    if (psRow) paymentSourceDesc = (psRow as any).description || invoice.payment_source;
  }

  // Build line rows HTML
  const lineRowsHtml = invoiceLines
    .map((line: any) => {
      const desc = ptMap[line.payment_code] || line.payment_code;
      const curr = line.currency_code || 'XCD';
      const amt = Number(line.amount || 0).toFixed(2);
      const baseAmt = Number(line.amount_base || 0).toFixed(2);
      return `<tr><td>${desc}</td><td>${curr}</td><td style="text-align:right;">${amt}</td><td style="text-align:right;">${baseAmt}</td></tr>`;
    })
    .join('\n  ');

  const invoiceStatus = statusMap[invoice.status] || invoice.status || 'Original';

  const invoiceDate = invoice.created_at
    ? format(new Date(invoice.created_at), 'dd-MMM-yyyy')
    : format(new Date(), 'dd-MMM-yyyy');

  const dueDateFormatted = invoice.due_date
    ? format(new Date(invoice.due_date), 'dd-MMM-yyyy')
    : '';

  const baseCurrency = invoice.base_currency || 'XCD';

  // Fetch receipt/invoice logo URL from config
  let logoUrl = '/images/ssb-logo.png';
  try {
    const { data: logoCfg } = await supabase
      .from('payment_module_config')
      .select('config_value')
      .eq('config_key', 'receipt_invoice_logo_url')
      .single();
    if (logoCfg?.config_value) {
      const val = logoCfg.config_value;
      logoUrl = typeof val === 'string' ? val : '/images/ssb-logo.png';
    }
  } catch { /* use default */ }

  return {
    '{{logo_url}}': logoUrl,
    '{{org_name}}': 'Social Security Board\nSt. Kitts and Nevis',
    '{{invoice_number}}': invoice.invoice_number || '',
    '{{invoice_date}}': invoiceDate,
    '{{due_date}}': dueDateFormatted,
    '{{status}}': invoiceStatus,
    '{{payer_name}}': payerName,
    '{{payer_id}}': invoice.payer_id || '',
    '{{payer_type}}': invoice.payer_type || '',
    '{{payer_email}}': payerEmail,
    '{{payer_phone}}': payerPhone,
    '{{payer_address}}': payerAddress,
    '{{invoice_type}}': invoiceTypeDesc,
    '{{payment_source}}': paymentSourceDesc,
    '{{currency_code}}': invoice.currency_code || 'XCD',
    '{{line_rows}}': lineRowsHtml,
    '{{total_amount}}': Number(invoice.total_amount || 0).toFixed(2),
    '{{total_amount_base}}': Number(invoice.total_amount_base || 0).toFixed(2),
    '{{base_currency}}': baseCurrency,
    '{{public_notes}}': invoice.public_notes || '',
    '{{print_date}}': format(new Date(), 'dd-MMM-yyyy HH:mm:ss'),
  };
}

/**
 * Main entry point: print an invoice by invoice id.
 * Fetches the HTML template, resolves all placeholders, and opens a print window.
 */
export async function printConfiguredInvoice(invoiceId: number): Promise<void> {
  const [templateHtml, placeholders] = await Promise.all([
    fetchInvoiceTemplate(),
    fetchInvoiceData(invoiceId),
  ]);

  // Replace all placeholders in the HTML template
  let resolvedHtml = templateHtml;
  for (const [key, value] of Object.entries(placeholders)) {
    resolvedHtml = resolvedHtml.split(key).join(value);
  }

  const printWindow = window.open('', '_blank', 'width=800,height=900');
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
