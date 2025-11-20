import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function TrendReports() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Trend Analysis"
        subtitle="Historical trends and predictive analytics"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Reports', href: '/compliance/reports' },
          { label: 'Trend Analysis' }
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {['Compliance Trends (12 months)', 'Case Creation Trends', 'Resolution Rate Trends', 'Financial Recovery Trends'].map((title, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{title}</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-muted-foreground">Trend data will appear here</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
