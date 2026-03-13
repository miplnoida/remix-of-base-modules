import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DataTable, StatusBadge } from '@/components/common';
import type { DataTableColumn } from '@/components/common';
import { Loader2, FileText } from 'lucide-react';

interface PlanAmendmentHistoryProps {
  planId: string;
  planType: 'annual' | 'department';
}

export function PlanAmendmentHistory({ planId, planType }: PlanAmendmentHistoryProps) {
  const { data: amendments = [], isLoading } = useQuery({
    queryKey: ['ia_plan_amendments', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_plan_amendments' as any)
        .select('*')
        .eq('plan_id', planId)
        .eq('plan_type', planType)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const columns: DataTableColumn<any>[] = [
    { key: 'field_changed', header: 'Field Changed', render: (row) => <span className="font-medium">{row.field_changed}</span> },
    { key: 'old_value', header: 'Previous Value', render: (row) => <span className="text-muted-foreground">{row.old_value || '-'}</span> },
    { key: 'new_value', header: 'New Value', render: (row) => row.new_value || '-' },
    { key: 'reason', header: 'Reason', render: (row) => row.reason || '-' },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status || 'Pending'} /> },
    { key: 'requested_by', header: 'Requested By', render: (row) => row.requested_by || '-' },
    { key: 'created_at', header: 'Date', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (amendments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mb-2" />
        <p className="text-sm">No amendments recorded for this plan.</p>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={amendments}
      emptyMessage="No amendments found"
    />
  );
}
