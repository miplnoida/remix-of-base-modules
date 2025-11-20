import { useState } from 'react';
import { ReportLayout } from '@/components/reports/ReportLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/MetricCard';
import { QueryByFilter } from '@/components/shared/QueryByFilter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CreditCard, AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import { CHART_COLORS, CHART_STYLES, CHART_PALETTES } from '@/lib/chartColors';

const mockData = {
  summary: { totalPrinted: 1245, totalSpoiled: 34, spoilRate: 2.7, stations: 4 },
  byCardType: [
    { type: 'New Registration', printed: 456, spoiled: 12 },
    { type: 'Replacement', printed: 389, spoiled: 10 },
    { type: 'Renewal', printed: 278, spoiled: 8 },
    { type: 'Correction', printed: 122, spoiled: 4 }
  ],
  byStation: [
    { station: 'Station A', printed: 412, spoiled: 9 },
    { station: 'Station B', printed: 385, spoiled: 11 },
    { station: 'Station C', printed: 298, spoiled: 8 },
    { station: 'Station D', printed: 150, spoiled: 6 }
  ],
  details: [
    { cardId: 'CARD-2024-1234', personId: 'IP-2024-456', cardType: 'New Registration', printedDate: '2024-03-15', printedBy: 'Officer A', station: 'Station A', spoiled: false },
    { cardId: 'CARD-2024-1235', personId: 'IP-2024-789', cardType: 'Replacement', printedDate: '2024-03-15', printedBy: 'Officer B', station: 'Station B', spoiled: true },
    { cardId: 'CARD-2024-1236', personId: 'IP-2024-234', cardType: 'Renewal', printedDate: '2024-03-14', printedBy: 'Officer C', station: 'Station A', spoiled: false },
    { cardId: 'CARD-2024-1237', personId: 'IP-2024-567', cardType: 'Correction', printedDate: '2024-03-14', printedBy: 'Officer A', station: 'Station C', spoiled: true }
  ]
};

export default function PrintedSpoiledCardsReport() {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const filterFields = [
    { name: 'dateRange', label: 'Date Range', type: 'daterange' as const },
    { name: 'cardType', label: 'Card Type', type: 'select' as const, options: [
      { label: 'New Registration', value: 'new' },
      { label: 'Replacement', value: 'replacement' },
      { label: 'Renewal', value: 'renewal' },
      { label: 'Correction', value: 'correction' }
    ]},
    { name: 'station', label: 'Scanner Station', type: 'text' as const },
    { name: 'officer', label: 'Printed By', type: 'text' as const },
    { name: 'spoiled', label: 'Status', type: 'select' as const, options: [
      { label: 'All', value: 'all' },
      { label: 'Printed', value: 'printed' },
      { label: 'Spoiled', value: 'spoiled' }
    ]}
  ];

  return (
    <ReportLayout
      title="Printed Cards & Spoiled Cards Report"
      subtitle="Track card printing activity and spoilage rates"
      breadcrumbs={[
        { label: 'Insured Persons', href: '/person/management' },
        { label: 'Reports' },
        { label: 'Printed & Spoiled Cards' }
      ]}
      filterPanel={<QueryByFilter fields={filterFields} onFilter={setFilters} defaultExpanded={false} />}
      summaryMetrics={
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total Printed" value={mockData.summary.totalPrinted.toString()} icon={Printer} variant="success" />
          <MetricCard title="Total Spoiled" value={mockData.summary.totalSpoiled.toString()} icon={AlertTriangle} variant="error" />
          <MetricCard title="Spoil Rate" value={`${mockData.summary.spoilRate}%`} icon={CreditCard} variant="warning" />
          <MetricCard title="Active Stations" value={mockData.summary.stations.toString()} icon={CheckCircle} variant="info" />
        </div>
      }
      chartArea={
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Printed vs Spoiled by Type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockData.byCardType}>
                  <CartesianGrid {...CHART_STYLES.grid} />
                  <XAxis dataKey="type" {...CHART_STYLES.axis} angle={-45} textAnchor="end" height={100} />
                  <YAxis {...CHART_STYLES.axis} />
                  <Tooltip {...CHART_STYLES.tooltip} />
                  <Legend />
                  <Bar dataKey="printed" fill={CHART_COLORS.primary} name="Printed" />
                  <Bar dataKey="spoiled" fill={CHART_COLORS.error} name="Spoiled" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Activity by Station</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={mockData.byStation} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.station}: ${entry.printed}`} outerRadius={80} fill={CHART_COLORS.primary} dataKey="printed">
                    {mockData.byStation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTES.pie[index % CHART_PALETTES.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      }
      tableArea={
        <Card>
          <CardHeader><CardTitle>Card Printing Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Card ID</TableHead>
                  <TableHead>Person ID</TableHead>
                  <TableHead>Card Type</TableHead>
                  <TableHead>Printed Date</TableHead>
                  <TableHead>Printed By</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Spoiled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockData.details.map((row) => (
                  <TableRow key={row.cardId}>
                    <TableCell className="font-medium">{row.cardId}</TableCell>
                    <TableCell>{row.personId}</TableCell>
                    <TableCell>{row.cardType}</TableCell>
                    <TableCell>{row.printedDate}</TableCell>
                    <TableCell>{row.printedBy}</TableCell>
                    <TableCell>{row.station}</TableCell>
                    <TableCell>
                      {row.spoiled ? (
                        <span className="text-[#E74C3C] font-semibold">Yes</span>
                      ) : (
                        <span className="text-[#009B4C] font-semibold">No</span>
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
