import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save, Loader2, RotateCcw, Copy, Check, Eye } from 'lucide-react';
import { usePaymentConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

const PLACEHOLDERS = [
  { key: '{{org_name}}', description: 'Organization name (multi-line supported)' },
  { key: '{{invoice_number}}', description: 'System-generated invoice number (e.g. INV-202603-001)' },
  { key: '{{invoice_date}}', description: 'Date invoice was created (dd-MMM-yyyy)' },
  { key: '{{due_date}}', description: 'Payment due date (dd-MMM-yyyy)' },
  { key: '{{status}}', description: 'Invoice status — Original / Reprint / Cancelled' },
  { key: '{{payer_name}}', description: 'Payer / company name' },
  { key: '{{payer_id}}', description: 'Payer ID / Registration number' },
  { key: '{{payer_type}}', description: 'Payer type code — ER / IP / SE / AP' },
  { key: '{{payer_email}}', description: 'Payer email address (if available)' },
  { key: '{{payer_phone}}', description: 'Payer phone number (if available)' },
  { key: '{{payer_address}}', description: 'Payer mailing address' },
  { key: '{{invoice_type}}', description: 'Invoice type description' },
  { key: '{{payment_source}}', description: 'Payment source description' },
  { key: '{{currency_code}}', description: 'Invoice currency code (e.g. XCD, USD)' },
  { key: '{{line_rows}}', description: 'Line items table rows — <tr><td>Type</td><td>Currency</td><td>Amount</td><td>Base</td></tr>' },
  { key: '{{total_amount}}', description: 'Total invoice amount in invoice currency' },
  { key: '{{total_amount_base}}', description: 'Total invoice amount in base currency' },
  { key: '{{base_currency}}', description: 'Base/functional currency code (e.g. XCD)' },
  { key: '{{public_notes}}', description: 'Public notes printed on invoice' },
  { key: '{{print_date}}', description: 'Current date/time when invoice is printed' },
];

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10pt;
    color: #333;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #1a56db; padding-bottom: 16px; }
  .inv-header .org { font-size: 14pt; font-weight: 700; color: #1a56db; white-space: pre-line; }
  .inv-header .inv-title { text-align: right; }
  .inv-header .inv-title h1 { font-size: 22pt; color: #1a56db; margin: 0; letter-spacing: 2px; }
  .inv-header .inv-title .inv-number { font-size: 11pt; color: #666; margin-top: 4px; }
  .inv-status { text-align: center; padding: 6px; background: #f0f4ff; border: 1px solid #c3d4f7; border-radius: 4px; font-weight: 700; font-size: 11pt; color: #1a56db; margin-bottom: 20px; }
  .inv-meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .inv-meta .bill-to, .inv-meta .inv-details { width: 48%; }
  .inv-meta h3 { font-size: 9pt; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .inv-meta p { margin: 2px 0; font-size: 10pt; }
  .inv-meta .value { font-weight: 600; }
  table.line-items { width: 100%; border-collapse: collapse; margin: 16px 0; }
  table.line-items thead th { background: #1a56db; color: #fff; padding: 8px 12px; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  table.line-items thead th:nth-child(3), table.line-items thead th:nth-child(4) { text-align: right; }
  table.line-items tbody td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 10pt; }
  table.line-items tbody td:nth-child(3), table.line-items tbody td:nth-child(4) { text-align: right; }
  table.line-items tbody tr:nth-child(even) { background: #f9fafb; }
  .totals { display: flex; justify-content: flex-end; margin-top: 8px; }
  .totals table { width: 280px; }
  .totals td { padding: 6px 12px; font-size: 10pt; }
  .totals td:last-child { text-align: right; font-weight: 600; }
  .totals .grand-total { border-top: 2px solid #1a56db; font-size: 12pt; color: #1a56db; }
  .notes { margin-top: 24px; padding: 12px; background: #f9fafb; border: 1px solid #eee; border-radius: 4px; }
  .notes h3 { font-size: 9pt; text-transform: uppercase; color: #999; margin-bottom: 4px; }
  .notes p { font-size: 10pt; white-space: pre-line; }
  .footer { margin-top: 32px; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
</style>
</head>
<body>

<div class="inv-header">
  <div class="org">{{org_name}}</div>
  <div class="inv-title">
    <h1>INVOICE</h1>
    <div class="inv-number">{{invoice_number}}</div>
  </div>
</div>

<div class="inv-status">*** {{status}} ***</div>

<div class="inv-meta">
  <div class="bill-to">
    <h3>Bill To</h3>
    <p class="value">{{payer_name}}</p>
    <p>{{payer_id}}</p>
    <p>{{payer_address}}</p>
    <p>{{payer_email}}</p>
    <p>{{payer_phone}}</p>
  </div>
  <div class="inv-details">
    <h3>Invoice Details</h3>
    <p><span style="color:#999;">Invoice Date:</span> <span class="value">{{invoice_date}}</span></p>
    <p><span style="color:#999;">Due Date:</span> <span class="value">{{due_date}}</span></p>
    <p><span style="color:#999;">Invoice Type:</span> <span class="value">{{invoice_type}}</span></p>
    <p><span style="color:#999;">Payment Source:</span> <span class="value">{{payment_source}}</span></p>
    <p><span style="color:#999;">Currency:</span> <span class="value">{{currency_code}}</span></p>
  </div>
</div>

<table class="line-items">
  <thead>
    <tr>
      <th>Payment Type</th>
      <th>Currency</th>
      <th>Amount</th>
      <th>Base ({{base_currency}})</th>
    </tr>
  </thead>
  <tbody>
    {{line_rows}}
  </tbody>
</table>

<div class="totals">
  <table>
    <tr>
      <td>Total ({{currency_code}}):</td>
      <td>{{total_amount}}</td>
    </tr>
    <tr class="grand-total">
      <td>Total ({{base_currency}}):</td>
      <td>{{total_amount_base}}</td>
    </tr>
  </table>
</div>

<div class="notes">
  <h3>Notes</h3>
  <p>{{public_notes}}</p>
</div>

<div class="footer">
  <p>This invoice is computer-generated by Social Security Board.</p>
  <p>Printed: {{print_date}}</p>
</div>

</body>
</html>`;

const SAMPLE_DATA: Record<string, string> = {
  '{{org_name}}': 'Social Security Board\nSt. Kitts and Nevis',
  '{{invoice_number}}': 'INV-202603-001',
  '{{invoice_date}}': '21-Mar-2026',
  '{{due_date}}': '20-Apr-2026',
  '{{status}}': 'Original',
  '{{payer_name}}': 'ABC Construction Ltd.',
  '{{payer_id}}': 'ER-10234',
  '{{payer_type}}': 'ER',
  '{{payer_email}}': 'accounts@abcconstruction.com',
  '{{payer_phone}}': '+1 (869) 465-1234',
  '{{payer_address}}': 'Bay Road, Basseterre<br/>St. Kitts',
  '{{invoice_type}}': 'Contribution Invoice',
  '{{payment_source}}': 'Direct',
  '{{currency_code}}': 'XCD',
  '{{line_rows}}': '<tr><td>Social Security</td><td>XCD</td><td style="text-align:right;">2,000.00</td><td style="text-align:right;">2,000.00</td></tr>\n  <tr><td>Employment Injury</td><td>XCD</td><td style="text-align:right;">500.00</td><td style="text-align:right;">500.00</td></tr>\n  <tr><td>Levy</td><td>USD</td><td style="text-align:right;">277.78</td><td style="text-align:right;">750.00</td></tr>',
  '{{total_amount}}': '2,777.78',
  '{{total_amount_base}}': '3,250.00',
  '{{base_currency}}': 'XCD',
  '{{public_notes}}': 'Monthly contribution payment for March 2026.',
  '{{print_date}}': '21-Mar-2026 14:35:22',
};

const InvoiceTemplateTab: React.FC = () => {
  const { data: config, isLoading } = usePaymentConfig('invoice_template');
  const updateConfig = useUpdatePaymentConfig();

  const [htmlTemplate, setHtmlTemplate] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (config?.config_value) {
      const val = config.config_value;
      if (typeof val === 'string') {
        setHtmlTemplate(val);
      } else if (typeof val === 'object' && (val as any).html_template) {
        setHtmlTemplate((val as any).html_template);
      } else {
        setHtmlTemplate(DEFAULT_HTML_TEMPLATE);
      }
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    if (!htmlTemplate.trim()) {
      toast.error('Template cannot be empty');
      return;
    }
    await updateConfig.mutateAsync({
      key: 'invoice_template',
      value: { html_template: htmlTemplate },
    });
  }, [htmlTemplate, updateConfig]);

  const handleReset = () => {
    setHtmlTemplate(DEFAULT_HTML_TEMPLATE);
    toast.info('Template reset to default. Click Save to persist.');
  };

  const handleCopyPlaceholder = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleInsertPlaceholder = (key: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = htmlTemplate.substring(0, start);
    const after = htmlTemplate.substring(end);
    setHtmlTemplate(before + key + after);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + key.length;
    }, 0);
  };

  const getPreviewHtml = useCallback(() => {
    let html = htmlTemplate;
    for (const [key, value] of Object.entries(SAMPLE_DATA)) {
      html = html.split(key).join(value);
    }
    return html;
  }, [htmlTemplate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Invoice HTML Template</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset Default
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={!htmlTemplate.trim()}>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Preview
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateConfig.isPending}>
                  {updateConfig.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save Template
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Write the invoice layout in HTML. Use placeholders from the list on the right. Click a placeholder to insert it at cursor position.
            </p>
          </CardHeader>
          <CardContent className="flex-1 pb-3">
            <textarea
              ref={textareaRef}
              value={htmlTemplate}
              onChange={(e) => setHtmlTemplate(e.target.value)}
              className="w-full h-[600px] font-mono text-xs p-3 rounded-md border border-input bg-muted/30 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              spellCheck={false}
              placeholder="Enter invoice HTML template..."
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Available Placeholders</CardTitle>
            <p className="text-xs text-muted-foreground">
              Click to insert at cursor. These are resolved dynamically from invoice data at print time.
            </p>
          </CardHeader>
          <CardContent className="flex-1 pb-3">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1.5 pr-2">
                {PLACEHOLDERS.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-start gap-2 p-2 rounded-md border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors group"
                    onClick={() => handleInsertPlaceholder(p.key)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-xs text-primary font-semibold">{p.key}</code>
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPlaceholder(p.key);
                          }}
                          title="Copy to clipboard"
                        >
                          {copiedKey === p.key ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{p.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Invoice Preview (Sample Data)
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-md bg-white p-2 overflow-auto max-h-[70vh]">
            <iframe
              title="Invoice Preview"
              srcDoc={getPreviewHtml()}
              className="w-full border-0"
              style={{ minHeight: 700 }}
              sandbox=""
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            This preview uses sample data. Actual invoices will use real invoice values.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceTemplateTab;
