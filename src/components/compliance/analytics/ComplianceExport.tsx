import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) {
    toast.error('No data to export');
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = r[h];
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${rows.length} rows to ${filename}`);
}

async function exportViolations() {
  const { data, error } = await supabase
    .from('ce_violations')
    .select('violation_number, employer_name, employer_id, status, priority, severity, period_from, period_to, total_amount, created_at, resolved_at, due_date, assigned_to_name')
    .eq('is_deleted', false)
    .eq('is_merged', false)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) { toast.error('Export failed'); return; }
  downloadCSV('violations_export.csv', data || []);
}

async function exportCases() {
  const { data, error } = await supabase
    .from('ce_cases')
    .select('case_number, employer_name, employer_id, status, priority, case_type, total_amount, opened_date, closed_date, assigned_officer_name')
    .eq('is_deleted', false)
    .order('opened_date', { ascending: false })
    .limit(5000);
  if (error) { toast.error('Export failed'); return; }
  downloadCSV('cases_export.csv', data || []);
}

async function exportNotices() {
  const { data, error } = await supabase
    .from('ce_notices')
    .select('notice_number, notice_type, status, employer_name, violation_id, response_received, created_at, sent_date, delivered_date')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) { toast.error('Export failed'); return; }
  downloadCSV('notices_export.csv', data || []);
}

export function ComplianceExport() {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={exportViolations}>
        <Download className="h-4 w-4 mr-1" /> Violations CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportCases}>
        <Download className="h-4 w-4 mr-1" /> Cases CSV
      </Button>
      <Button variant="outline" size="sm" onClick={exportNotices}>
        <Download className="h-4 w-4 mr-1" /> Notices CSV
      </Button>
    </div>
  );
}
