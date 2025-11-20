import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingDown, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHART_COLORS, CHART_STYLES } from '@/lib/chartColors';

const mockData = {
  summary: { totalRefunds: 45, totalAmount: 125600, processed: 38, pending: 7 },
  byReason: [
    { reason: 'Overpayment', count: 18, amount: 52000 },
    { reason: 'Duplicate Payment', count: 12, amount: 34000 },
    { reason: 'Service Cancellation', count: 8, amount: 22000 },
    { reason: 'Fee Waiver', count: 7, amount: 17600 }
  ],
  timeline: [
    { month: 'Jan', processed: 12, pending: 3 },
    { month: 'Feb', processed: 15, pending: 2 },
    { month: 'Mar', processed: 11, pending: 2 }
  ],
  details: [
    { refundId: 'REF-2024-001', personId: 'IP-2024-456', amount: 1200, reason: 'Overpayment', receivedAtCRD: '2024-03-15', receivedBy: 'Officer A', status: 'Processed' },
    { refundId: 'REF-2024-002', personId: 'IP-2024-789', amount: 850, reason: 'Duplicate Payment', receivedAtCRD: null, receivedBy: null, status: 'Pending' },
    { refundId: 'REF-2024-003', personId: 'IP-2024-234', amount: 2400, reason: 'Service Cancellation', receivedAtCRD: '2024-03-14', receivedBy: 'Officer B', status: 'Processed' },
    { refundId: 'REF-2024-004', personId: 'IP-2024-567', amount: 650, reason: 'Fee Waiver', receivedAtCRD: null, receivedBy: null, status: 'Pending' }
  ]
};

export default function RefundsToCRUReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'reason', label: 'Refund Reason', type: 'select' as const, options: [
      { label: 'Overpayment', value: 'overpayment' },
      { label: 'Duplicate Payment', value: 'duplicate' },
      { label: 'Service Cancellation', value: 'cancellation' },
      { label: 'Fee Waiver', value: 'waiver' }
    ]},
    { name: 'status', label: 'Status', type: 'select' as const, options: [
      { label: 'Processed', value: 'processed' },
      { label: 'Pending', value: 'pending' }
    ]},
    { name: 'officer', label: 'CRD Officer', type: 'text' as const }
  ];

  const handleReceived = (refundId: string) => {
    console.log('Mark received at CRD:', refundId);
  };

  return (
    <ReportLayout
      title="Refunds Sent to CRU/Finance Report"
      subtitle="Track refund processing and status from CRD to Finance"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Refunds to CRU/Finance' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Refunds" value={mockData.summary.totalRefunds.toString()} icon={TrendingDown} variant="info" />
          <MetricCard title="Total Amount" value={`EC$${mockData.summary.totalAmount.toLocaleString()}`} icon={DollarSign} variant="default" />
          <MetricCard title="Processed" value={mockData.summary.processed.toString()} icon={CheckCircle} variant="success" />
          <MetricCard title="Pending" value={mockData.summary.pending.toString()} icon={Clock} variant="warning" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Refunds by Reason</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.byReason}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="reason" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Bar dataKey="count" fill={CHART_COLORS.primary} />
                  <Bar dataKey="amount" fill={CHART_COLORS.blue} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Monthly Processing Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData.timeline}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="month" {...CHART_STYLES.axis} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Legend />
                  <Line type="monotone" dataKey="processed" stroke={CHART_COLORS.primary} name="Processed" />
                  <Line type="monotone" dataKey="pending" stroke={CHART_COLORS.gold} name="Pending" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Refund Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Refund ID</TableHead>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Received at CRD</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row) => (
                  <TableRow key={row.refundId}>
                    <TableCell className="font-medium">{row.refundId}</TableCell>
                    <TableCell>{row.personId}</TableCell>
                    <TableCell>EC${row.amount.toLocaleString()}</TableCell>
                    <TableCell>{row.reason}</TableCell>
                    <TableCell>{row.receivedAtCRD || '-'}</TableCell>
                    <TableCell>{row.receivedBy || '-'}</TableCell>
                    <TableCell>
                      <span className={row.status === 'Processed' ? 'text-[#009B4C] font-semibold' : 'text-[#F59E0B] font-semibold'}>
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {!row.receivedAtCRD && (
                        <Button size="sm" onClick={() => handleReceived(row.refundId)}>
                          Mark Received
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      }
      onExportCSV={() => console.log('Export CSV')}
      onExportPDF={() => console.log('Export PDF')}
    />
  );
}
