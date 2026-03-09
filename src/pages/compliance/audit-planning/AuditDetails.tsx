import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Building, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

export default function AuditDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock audit data
  const audit = {
    id: id || 'A-2024-001',
    auditNumber: 'A-2024-001',
    employer: {
      id: 'EMP-001',
      name: 'Global Industries Ltd',
      registrationNumber: 'REG-2020-456',
      zone: 'St. Kitts Zone 1',
      address: '123 Main Street, Basseterre',
      contactPerson: 'John Manager',
      phone: '+1-869-465-1234',
      email: 'contact@globalindustries.kn'
    },
    type: 'Routine',
    riskLevel: 'Medium',
    status: 'Completed',
    scheduledDate: '2024-01-15',
    completedDate: '2024-01-20',
    auditor: {
      name: 'John Smith',
      employeeNo: 'AUD-001',
      email: 'j.smith@ssb.gov.kn'
    },
    purpose: 'Annual compliance verification for contribution submissions and payment accuracy',
    scope: 'Review of C3 submissions for Q4 2023, verification of employee records, validation of contribution calculations',
    findings: [
      {
        id: 'F-001',
        findingNumber: 'A-2024-001-F001',
        severity: 'High',
        category: 'Contribution Calculation',
        title: 'Incorrect Social Security Contribution Calculation for 3 Employees',
        description: 'During the review of C3 submissions for October 2023, discrepancies were found in the contribution calculations for three employees. The employer used incorrect insurable earnings caps, resulting in underpayment of social security contributions.',
        criteria: 'Social Security Act Section 12 - Contributions must be calculated based on actual insurable earnings up to the statutory ceiling of XCD 6,500 per month.',
        condition: 'Contributions for employees SSN 123-456-789, 234-567-890, and 345-678-901 were calculated using earnings capped at XCD 5,000 instead of XCD 6,500.',
        cause: 'Outdated payroll software configuration following the 2023 ceiling increase.',
        effect: 'Total underpayment of XCD 1,350.00 in social security contributions for Q4 2023. Affected employees may face reduced benefit entitlements.',
        recommendation: 'Update payroll system to reflect current contribution ceilings. Submit corrected C3 forms and remit outstanding contributions with applicable penalties.',
        amountInvolved: 1350.00,
        periodsAffected: ['2023-10', '2023-11', '2023-12'],
        status: 'Open',
        assignedTo: 'Compliance Officer - Sarah Johnson',
        targetResolutionDate: '2024-02-28'
      },
      {
        id: 'F-002',
        findingNumber: 'A-2024-001-F002',
        severity: 'Medium',
        category: 'Documentation',
        title: 'Missing Employee Records for 2 Workers',
        description: 'Employment records for two employees listed on C3 submissions could not be produced during the audit inspection.',
        criteria: 'Employment Records Regulation 2018 - Employers must maintain complete personnel files including employment contracts, SSN verification, and salary records for all employees.',
        condition: 'Personnel files for employees SSN 456-789-012 and 567-890-123 were not available for inspection. Only payroll records were provided.',
        cause: 'Inadequate record-keeping procedures and recent office relocation resulted in misplaced personnel files.',
        effect: 'Inability to verify employment eligibility and contribution accuracy for 2 employees representing XCD 3,200 in monthly contributions.',
        recommendation: 'Implement systematic record-keeping procedures. Recreate missing personnel files from available documentation. Provide compliance training to HR staff.',
        amountInvolved: 3200.00,
        periodsAffected: ['2023-10', '2023-11', '2023-12'],
        status: 'Under Review',
        assignedTo: 'Compliance Officer - Sarah Johnson',
        targetResolutionDate: '2024-03-15'
      },
      {
        id: 'F-003',
        findingNumber: 'A-2024-001-F003',
        severity: 'Low',
        category: 'Timeliness',
        title: 'Late C3 Submission for November 2023',
        description: 'C3 submission for November 2023 was filed 5 days after the statutory deadline.',
        criteria: 'Social Security Regulations - C3 forms must be submitted by the 15th day of the following month.',
        condition: 'November 2023 C3 form was submitted on December 20, 2023, instead of December 15, 2023.',
        cause: 'Temporary absence of payroll officer due to illness and inadequate backup procedures.',
        effect: 'Late submission penalty of XCD 150.00 applicable under regulations.',
        recommendation: 'Establish backup procedures for critical compliance deadlines. Designate alternate responsible officer for C3 submissions.',
        amountInvolved: 150.00,
        periodsAffected: ['2023-11'],
        status: 'Resolved',
        assignedTo: 'Compliance Officer - Sarah Johnson',
        targetResolutionDate: '2024-01-31'
      }
    ],
    evidence: [
      {
        id: 'E-001',
        type: 'Document',
        description: 'C3 Submission Forms Q4 2023 (October, November, December)',
        collectedDate: '2024-01-16',
        collectedBy: 'John Smith'
      },
      {
        id: 'E-002',
        type: 'Document',
        description: 'Payroll Records October-December 2023',
        collectedDate: '2024-01-16',
        collectedBy: 'John Smith'
      },
      {
        id: 'E-003',
        type: 'Photo',
        description: 'Photos of Employee Records Filing System',
        collectedDate: '2024-01-17',
        collectedBy: 'John Smith'
      },
      {
        id: 'E-004',
        type: 'Document',
        description: 'Employer Response Letter - Corrective Actions Plan',
        collectedDate: '2024-01-25',
        collectedBy: 'Sarah Johnson'
      }
    ],
    timeline: [
      {
        date: '2024-01-10',
        event: 'Audit Scheduled',
        description: 'Audit assigned to John Smith for employer Global Industries Ltd',
        performedBy: 'System'
      },
      {
        date: '2024-01-12',
        event: 'Notification Sent',
        description: 'Audit notification letter sent to employer',
        performedBy: 'John Smith'
      },
      {
        date: '2024-01-15',
        event: 'Audit Started',
        description: 'On-site audit commenced at employer premises',
        performedBy: 'John Smith'
      },
      {
        date: '2024-01-16',
        event: 'Document Review',
        description: 'C3 forms and payroll records reviewed',
        performedBy: 'John Smith'
      },
      {
        date: '2024-01-17',
        event: 'Physical Inspection',
        description: 'Employee records and filing systems inspected',
        performedBy: 'John Smith'
      },
      {
        date: '2024-01-18',
        event: 'Findings Identified',
        description: '3 findings documented with severity ratings',
        performedBy: 'John Smith'
      },
      {
        date: '2024-01-19',
        event: 'Exit Meeting',
        description: 'Audit findings discussed with employer management',
        performedBy: 'John Smith'
      },
      {
        date: '2024-01-20',
        event: 'Audit Completed',
        description: 'Audit report finalized and submitted',
        performedBy: 'John Smith'
      },
      {
        date: '2024-01-25',
        event: 'Employer Response',
        description: 'Employer submitted corrective actions plan',
        performedBy: 'Global Industries Ltd'
      }
    ],
    recommendations: [
      {
        priority: 'High',
        recommendation: 'Update payroll system configuration to reflect current XCD 6,500 monthly earnings ceiling',
        targetDate: '2024-02-15',
        status: 'In Progress'
      },
      {
        priority: 'High',
        recommendation: 'Submit corrected C3 forms for October-December 2023 with recalculated contributions',
        targetDate: '2024-02-28',
        status: 'Pending'
      },
      {
        priority: 'Medium',
        recommendation: 'Recreate missing personnel files from available documentation',
        targetDate: '2024-03-15',
        status: 'Pending'
      },
      {
        priority: 'Medium',
        recommendation: 'Implement systematic record-keeping procedures and document retention policy',
        targetDate: '2024-03-31',
        status: 'Not Started'
      },
      {
        priority: 'Low',
        recommendation: 'Establish backup procedures for critical compliance deadlines',
        targetDate: '2024-02-29',
        status: 'In Progress'
      }
    ]
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XCD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'High': 'bg-red-100 text-red-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-blue-100 text-blue-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Completed': 'bg-green-100 text-green-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Scheduled': 'bg-purple-100 text-purple-800',
      'Open': 'bg-orange-100 text-orange-800',
      'Under Review': 'bg-yellow-100 text-yellow-800',
      'Resolved': 'bg-green-100 text-green-800',
      'Pending': 'bg-gray-100 text-gray-800',
      'Not Started': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'High': 'bg-red-100 text-red-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-blue-100 text-blue-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={`Audit ${audit.auditNumber}`}
        subtitle="Detailed audit information and findings"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Audit Management', href: '/compliance/audit-management' },
          { label: audit.auditNumber }
        ]}
      />

      {/* Audit Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Audit Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(audit.status)}>
              {audit.status}
            </Badge>
            <div className="mt-2 text-sm text-muted-foreground">
              Scheduled: {audit.scheduledDate}
            </div>
            <div className="text-sm text-muted-foreground">
              Completed: {audit.completedDate}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getSeverityColor(audit.riskLevel)}>
              {audit.riskLevel}
            </Badge>
            <div className="mt-2 text-sm text-muted-foreground">
              Type: {audit.type}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audit.findings.length}</div>
            <div className="mt-2 text-sm">
              <span className="text-red-600">{audit.findings.filter(f => f.severity === 'High').length} High</span>
              {' • '}
              <span className="text-yellow-600">{audit.findings.filter(f => f.severity === 'Medium').length} Medium</span>
              {' • '}
              <span className="text-blue-600">{audit.findings.filter(f => f.severity === 'Low').length} Low</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="findings">Findings ({audit.findings.length})</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Employer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Employer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employer Name</label>
                <div className="text-base font-medium">{audit.employer.name}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Registration Number</label>
                <div className="text-base">{audit.employer.registrationNumber}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Zone</label>
                <div className="text-base">{audit.employer.zone}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                <div className="text-base">{audit.employer.contactPerson}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <div className="text-base">{audit.employer.phone}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="text-base">{audit.employer.email}</div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <div className="text-base">{audit.employer.address}</div>
              </div>
            </CardContent>
          </Card>

          {/* Auditor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Auditor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <div className="text-base font-medium">{audit.auditor.name}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Employee Number</label>
                <div className="text-base">{audit.auditor.employeeNo}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="text-base">{audit.auditor.email}</div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Scope */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Scope & Purpose</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Purpose</label>
                <div className="text-base mt-1">{audit.purpose}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Scope</label>
                <div className="text-base mt-1">{audit.scope}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="findings" className="space-y-4">
          {audit.findings.map((finding) => (
            <Card key={finding.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {finding.title}
                      <Badge className={getSeverityColor(finding.severity)}>
                        {finding.severity}
                      </Badge>
                      <Badge className={getStatusColor(finding.status)}>
                        {finding.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {finding.findingNumber} • Category: {finding.category}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Description</label>
                      <div className="text-sm mt-1">{finding.description}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Criteria</label>
                      <div className="text-sm mt-1">{finding.criteria}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Condition</label>
                      <div className="text-sm mt-1">{finding.condition}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cause</label>
                      <div className="text-sm mt-1">{finding.cause}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Effect</label>
                      <div className="text-sm mt-1">{finding.effect}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Recommendation</label>
                      <div className="text-sm mt-1">{finding.recommendation}</div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount Involved</label>
                    <div className="text-base font-semibold text-red-600">
                      {formatCurrency(finding.amountInvolved)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Periods Affected</label>
                    <div className="text-sm">{finding.periodsAffected.join(', ')}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Target Resolution</label>
                    <div className="text-sm">{finding.targetResolutionDate}</div>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                  <div className="text-sm">{finding.assignedTo}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="evidence">
          <Card>
            <CardHeader>
              <CardTitle>Evidence Collected</CardTitle>
              <CardDescription>Documents and evidence gathered during audit</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evidence ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Collected Date</TableHead>
                    <TableHead>Collected By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.evidence.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.type}</Badge>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.collectedDate}</TableCell>
                      <TableCell>{item.collectedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Audit Recommendations</CardTitle>
              <CardDescription>Recommended corrective actions and follow-up items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {audit.recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority} Priority
                          </Badge>
                          <Badge className={getStatusColor(rec.status)}>
                            {rec.status}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium">{rec.recommendation}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Target: {rec.targetDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Audit Timeline</CardTitle>
              <CardDescription>Complete audit activity history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {audit.timeline.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      {index < audit.timeline.length - 1 && (
                        <div className="w-px h-full bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{item.event}</span>
                        <span className="text-xs text-muted-foreground">{item.date}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">
                        {item.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        By: {item.performedBy}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/compliance/audit-management')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Audits
        </Button>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>
    </div>
  );
}
