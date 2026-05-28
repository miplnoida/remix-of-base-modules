import { ComplianceHelpButton } from '@/components/help/ComplianceHelpButton';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  DollarSign, 
  ClipboardCheck,
  Users,
  AlertTriangle,
  Calendar
} from 'lucide-react';

export default function ComplianceReports() {
  const navigate = useNavigate();

  const reportCategories = [
    {
      title: 'Case Management Reports',
      icon: FileText,
      description: 'Case analytics, trends, and status tracking',
      reports: [
        { name: 'Cases by Status', path: '/compliance/reports/case-analytics' },
        { name: 'Cases by Type', path: '/compliance/reports/case-analytics' },
        { name: 'Case Resolution Time', path: '/compliance/reports/case-analytics' },
        { name: 'Cases by Zone', path: '/compliance/reports/case-analytics' },
      ]
    },
    {
      title: 'Inspector Performance',
      icon: Users,
      description: 'Field activity, plan compliance, and productivity metrics',
      reports: [
        { name: 'Weekly Plan Compliance', path: '/compliance/reports/inspector-performance/weekly-plan' },
        { name: 'Field Activities Summary', path: '/compliance/reports/inspector-performance/field-activities' },
        { name: 'Check-In/Check-Out Audit', path: '/compliance/reports/inspector-performance/check-in-out' },
        { name: 'Violations Handled by Inspector', path: '/compliance/reports/inspector-performance/violations-by-inspector' },
      ]
    },
    {
      title: 'C3 Compliance Reports',
      icon: ClipboardCheck,
      description: 'C3 submission rates, timeliness, and employer compliance',
      reports: [
        { name: 'On-Time vs Late Submissions', path: '/compliance/reports/c3-compliance/on-time-vs-late' },
        { name: 'Missing C3 Submissions', path: '/compliance/reports/c3-compliance/missing' },
        { name: 'C3 Without Payment', path: '/compliance/reports/c3-compliance/without-payment' },
        { name: 'Compliance Rate by Zone', path: '/compliance/reports/c3-compliance/rate-by-zone' },
      ]
    },
    {
      title: 'Arrears & Collections',
      icon: DollarSign,
      description: 'Outstanding balances, payment trends, and recovery metrics',
      reports: [
        { name: 'Total Arrears by Zone', path: '/compliance/reports/arrears/by-zone' },
        { name: 'Arrears Aging Analysis', path: '/compliance/reports/arrears/aging' },
        { name: 'Collections Over Time', path: '/compliance/reports/arrears/collections-over-time' },
        { name: 'Top 50 Arrears Employers', path: '/compliance/reports/arrears/top-50' },
      ]
    },
    {
      title: 'Audit & Inspection Reports',
      icon: BarChart3,
      description: 'Audit findings, inspection results, and risk assessments',
      reports: [
        { name: 'Audit Completion Rate', path: '/compliance/reports/audit/completion-rate' },
        { name: 'Findings by Severity', path: '/compliance/reports/audit/findings-by-severity' },
        { name: 'Inspection Coverage by Zone', path: '/compliance/reports/audit/coverage-by-zone' },
        { name: 'Risk-Based Audit Results', path: '/compliance/reports/audit/risk-based' },
      ]
    },
    {
      title: 'Violation Reports',
      icon: AlertTriangle,
      description: 'Violation counts, types, resolution time, and zone distribution',
      reports: [
        { name: 'Violations Summary', path: '/compliance/reports/violations/summary' },
        { name: 'Violations by Status', path: '/compliance/reports/violations/status' },
        { name: 'Violations by Type', path: '/compliance/reports/violations/type' },
        { name: 'Violation Resolution Time', path: '/compliance/reports/violations/resolution-time' },
        { name: 'Violations by Zone', path: '/compliance/reports/violations/zone' },
      ]
    },
    {
      title: 'Payment Arrangements',
      icon: Calendar,
      description: 'Active arrangements, defaults, and compliance tracking',
      reports: [
        { name: 'Active Arrangements', path: '/compliance/reports/arrangements/active' },
        { name: 'Defaulted Arrangements', path: '/compliance/reports/arrangements/defaulted' },
        { name: 'Arrangement Success Rate', path: '/compliance/reports/arrangements/success-rate' },
        { name: 'Installment Payment Trends', path: '/compliance/reports/arrangements/installment-trends' },
      ]
    },
    {
      title: 'Legal Escalation',
      icon: AlertTriangle,
      description: 'Cases escalated to legal, court proceedings, and outcomes',
      reports: [
        { name: 'Violations Escalated to Legal', path: '/compliance/reports/legal/escalated' },
        { name: 'Legal Stage Distribution', path: '/compliance/reports/legal/stage-distribution' },
        { name: 'Court Proceedings Status', path: '/compliance/reports/legal/court-status' },
        { name: 'Judgements & Enforcement', path: '/compliance/reports/legal/judgements' },
      ]
    },
    {
      title: 'Trend Analysis',
      icon: TrendingUp,
      description: 'Historical trends and predictive analytics',
      reports: [
        { name: 'Compliance Trends (12 months)', path: '/compliance/reports/trends/compliance-12m' },
        { name: 'Violation Creation Trends', path: '/compliance/reports/trends/violation-creation' },
        { name: 'Resolution Rate Trends', path: '/compliance/reports/trends/resolution-rate' },
        { name: 'Financial Recovery Trends', path: '/compliance/reports/trends/financial-recovery' },
      ]
    }

  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Compliance Reports"
        subtitle="Comprehensive analytics and performance reports"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Reports' }
        ]}
        actions={<ComplianceHelpButton screenKey="reports" />}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {reportCategories.map((category, index) => {
          const Icon = category.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle>{category.title}</CardTitle>
                    </div>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.reports.map((report, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => navigate(report.path)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {report.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
