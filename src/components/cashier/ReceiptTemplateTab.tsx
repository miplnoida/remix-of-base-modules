import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Save, Loader2, RotateCcw, Copy, Check, Eye } from 'lucide-react';
import { usePaymentConfig, useUpdatePaymentConfig } from '@/hooks/usePaymentModuleConfig';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ─── Placeholder definitions (real data resolved in receiptPrinter.ts) ─── */
const PLACEHOLDERS = [
  { key: '{{org_name}}', description: 'Organization name (multi-line supported)' },
  { key: '{{status}}', description: 'Receipt status — Original / Reprint / Cancelled' },
  { key: '{{cashier_name}}', description: 'Full name of the cashier who received the payment' },
  { key: '{{payer_name}}', description: 'Payer / company name (employer or insured person)' },
  { key: '{{payer_id}}', description: 'Payer ID / Registration number' },
  { key: '{{payer_address}}', description: 'Payer mailing address (line-break separated)' },
  { key: '{{payer_ssn}}', description: 'SSN of the insured person (if applicable)' },
  { key: '{{payer_type}}', description: 'Payer type code — ER / IP / SE' },
  { key: '{{date_received}}', description: 'Date payment was received (dd-MMM-yyyy)' },
  { key: '{{receipt_number}}', description: 'System-generated receipt number' },
  { key: '{{receipt_id}}', description: 'Numeric receipt ID' },
  { key: '{{receipt_total}}', description: 'Total payment amount (formatted with 2 decimals)' },
  { key: '{{payment_id}}', description: 'Payment transaction ID' },
  { key: '{{batch_number}}', description: 'Batch number the payment belongs to' },
  { key: '{{fund_rows}}', description: 'Fund breakdown table rows — <tr><td>Fund</td><td>Amount</td></tr>' },
  { key: '{{mop_rows}}', description: 'Method of payment table rows — <tr><td>Method</td><td>Amount</td></tr>' },
  { key: '{{print_date}}', description: 'Current date/time when receipt is printed' },
  { key: '{{period}}', description: 'Payment period (if available)' },
  { key: '{{remarks}}', description: 'Payment header remarks' },
];

/* ─── Default HTML template based on the existing receipt design ─── */
const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    color: #000;
    max-width: 300px;
    padding: 4mm;
  }
  .header { text-align: center; margin-bottom: 8px; }
  .header b { text-decoration: underline; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; padding: 1px 0; }
  .label { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  td { padding: 2px 0; }
  td:last-child { text-align: right; }
  .total-row { font-weight: bold; border-top: 1px solid #000; }
  .footer { margin-top: 16px; font-size: 9pt; text-align: center; }
  .status { text-align: center; font-weight: bold; font-size: 11pt; margin: 4px 0; }
</style>
</head>
<body>

<div class="header">
  <b>{{org_name}}</b>
</div>

<div class="status">*** {{status}} ***</div>

<div class="divider"></div>

<div class="row"><span class="label">Receipt #:</span><span>{{receipt_number}}</span></div>
<div class="row"><span class="label">Date:</span><span>{{date_received}}</span></div>
<div class="row"><span class="label">Cashier:</span><span>{{cashier_name}}</span></div>

<div class="divider"></div>

<div class="row"><span class="label">Received From:</span></div>
<div style="padding-left: 8px;">{{payer_name}}</div>
<div style="padding-left: 8px;">{{payer_id}}</div>
<div style="padding-left: 8px;">{{payer_address}}</div>

<div class="divider"></div>

<div class="label">Fund Breakdown:</div>
<table>
  <tr><td><u>Fund</u></td><td><u>Amount</u></td></tr>
  {{fund_rows}}
</table>

<div class="divider"></div>

<div class="label">Method of Payment:</div>
<table>
  <tr><td><u>Method</u></td><td><u>Amount</u></td></tr>
  {{mop_rows}}
</table>

<div class="divider"></div>

<div class="row total-row"><span>TOTAL:</span><span>\${{receipt_total}}</span></div>

<div class="footer">
  <p>Thank you for your payment.</p>
  <p>This receipt is computer-generated.</p>
  <p>Printed: {{print_date}}</p>
</div>

</body>
</html>`;

/* ─── Sample data for preview ─── */
const SAMPLE_DATA: Record<string, string> = {
  '{{org_name}}': 'Social Security Board\nSt. Kitts and Nevis',
  '{{status}}': 'Original',
  '{{cashier_name}}': 'Jane Williams',
  '{{payer_name}}': 'ABC Construction Ltd.',
  '{{payer_id}}': 'ER-10234',
  '{{payer_address}}': 'Bay Road, Basseterre<br/>St. Kitts',
  '{{payer_ssn}}': '123456',
  '{{payer_type}}': 'ER',
  '{{date_received}}': '20-Mar-2026',
  '{{receipt_number}}': 'RCT-2026-001234',
  '{{receipt_id}}': '1234',
  '{{receipt_total}}': '3,250.00',
  '{{payment_id}}': '5678',
  '{{batch_number}}': 'B-2026-0042',
  '{{fund_rows}}': '<tr><td>Social Security</td><td>$2,000.00</td></tr>\n  <tr><td>Levy</td><td>$750.00</td></tr>\n  <tr><td>Employment Injury</td><td>$500.00</td></tr>',
  '{{mop_rows}}': '<tr><td>Cash</td><td>$1,250.00</td></tr>\n  <tr><td>Cheque</td><td>$2,000.00</td></tr>',
  '{{print_date}}': '20-Mar-2026 14:35:22',
  '{{period}}': '03/2026',
  '{{remarks}}': 'Monthly contribution payment',
};

const ReceiptTemplateTab: React.FC = () => {
  const { data: config, isLoading } = usePaymentConfig('receipt_template');
  const updateConfig = useUpdatePaymentConfig();

  const [htmlTemplate, setHtmlTemplate] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load template from DB or use default
  useEffect(() => {
    if (config?.config_value) {
      const val = config.config_value;
      if (typeof val === 'string') {
        setHtmlTemplate(val);
      } else if (typeof val === 'object' && (val as any).html_template) {
        setHtmlTemplate((val as any).html_template);
      } else {
        // Old format — load default
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
      key: 'receipt_template',
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
    // Set cursor after inserted placeholder
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
      {/* ─── HTML Editor (2/3 width) ─── */}
      <div className="lg:col-span-2 space-y-3">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Receipt HTML Template</CardTitle>
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
              Write the receipt layout in HTML. Use placeholders from the list on the right. Click a placeholder to insert it at cursor position.
            </p>
          </CardHeader>
          <CardContent className="flex-1 pb-3">
            <textarea
              ref={textareaRef}
              value={htmlTemplate}
              onChange={(e) => setHtmlTemplate(e.target.value)}
              className="w-full h-[600px] font-mono text-xs p-3 rounded-md border border-input bg-muted/30 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              spellCheck={false}
              placeholder="Enter receipt HTML template..."
            />
          </CardContent>
        </Card>
      </div>

      {/* ─── Placeholder List (1/3 width) ─── */}
      <div className="space-y-3">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Available Placeholders</CardTitle>
            <p className="text-xs text-muted-foreground">
              Click to insert at cursor. These are resolved dynamically from payment data at print time.
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
    </div>
  );
};

export default ReceiptTemplateTab;
