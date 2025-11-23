import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, MessageSquare, FileText, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockLegalRequisitions } from '@/data/mockLegalIntake';
import { Separator } from '@/components/ui/separator';

export default function IntakeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const requisition = mockLegalRequisitions.find(r => r.id === id);

  if (!requisition) {
    return (
      <div className="flex-1 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Requisition not found</h2>
          <Button onClick={() => navigate('/legal/cases/intake')} className="mt-4">
            Back to Intake
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Review':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Info Requested':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  return (
    <div className="flex-1 p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/legal/cases/intake')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{requisition.intakeId}</h1>
              <Badge variant="outline" className={getStatusColor(requisition.status)}>
                {requisition.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Legal Action Requisition</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Request More Info
          </Button>
          <Button>
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept Case
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Details</TabsTrigger>
          <TabsTrigger value="liability">Liability Statement</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Requisition Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4" />
                  Submission Date
                </div>
                <div className="font-medium">{new Date(requisition.submissionDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  Submitted By
                </div>
                <div className="font-medium">{requisition.submittedBy}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground mb-1">Period(s) for Action</div>
                <div className="font-medium">{requisition.period}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground mb-1">Reason for Legal Action</div>
                <div className="font-medium">{requisition.reason}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground mb-1">Particulars</div>
                <div className="text-sm">{requisition.legalActionDetails.particulars}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Employer Information
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Employer Name</div>
                <div className="font-medium">{requisition.employer.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Registration Number</div>
                <div className="font-medium">{requisition.employer.registrationNumber}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                  Address
                </div>
                <div className="text-sm">{requisition.employer.address}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Contact Number</div>
                <div className="text-sm">{requisition.employer.contactNumber}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">SSC</div>
                <div className="text-2xl font-bold">${requisition.financialDetails.ssc.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">SSF</div>
                <div className="text-2xl font-bold">${requisition.financialDetails.ssf.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Penalties</div>
                <div className="text-2xl font-bold text-destructive">${requisition.financialDetails.penalties.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Employees</div>
                <div className="text-2xl font-bold flex items-center gap-1">
                  👥 {requisition.financialDetails.employees}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Outstanding</div>
                <div className="text-2xl font-bold text-primary">${requisition.financialDetails.totalOutstanding.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">SSC</div>
                <div className="text-2xl font-bold">${requisition.financialDetails.ssc.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">SSF</div>
                <div className="text-2xl font-bold">${requisition.financialDetails.ssf.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Penalties</div>
                <div className="text-2xl font-bold text-destructive">${requisition.financialDetails.penalties.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Employees</div>
                <div className="text-2xl font-bold">{requisition.financialDetails.employees}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Outstanding</div>
                <div className="text-2xl font-bold text-primary">${requisition.financialDetails.totalOutstanding.toLocaleString()}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="liability" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Liability Statement Overview</h3>
            <div className="text-sm text-muted-foreground mb-4">Analysis as of {new Date().toLocaleDateString()}</div>
            
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total Contributions Due</div>
                <div className="text-2xl font-bold">${requisition.liabilityStatement.totalContributionsDue.toLocaleString()}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total Receivable Made</div>
                <div className="text-2xl font-bold text-green-600">${requisition.liabilityStatement.totalReceivable.toLocaleString()}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Contribution Outstanding</div>
                <div className="text-2xl font-bold text-orange-600">${requisition.liabilityStatement.contributionOutstanding.toLocaleString()}</div>
              </div>
              <div className="p-4 border rounded-lg bg-primary/5">
                <div className="text-sm text-muted-foreground mb-1">Total Outstanding</div>
                <div className="text-2xl font-bold text-primary">${requisition.liabilityStatement.totalContributionsDue.toLocaleString()}</div>
              </div>
            </div>

            <Separator className="my-6" />

            <h4 className="font-semibold mb-4">Contribution Type Breakdown</h4>
            <div className="text-sm text-muted-foreground mb-4">Detailed breakdown of contributions, payments, and penalties by type</div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">Type</th>
                    <th className="text-right p-3 text-sm font-medium">Contribution Due</th>
                    <th className="text-right p-3 text-sm font-medium">Payments</th>
                    <th className="text-right p-3 text-sm font-medium">Outstanding</th>
                    <th className="text-right p-3 text-sm font-medium">Penalties</th>
                    <th className="text-right p-3 text-sm font-medium">Total Due</th>
                  </tr>
                </thead>
                <tbody>
                  {requisition.liabilityStatement.contributionBreakdown.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-3 font-medium">{item.type}</td>
                      <td className="p-3 text-right">${item.amountDue.toLocaleString()}</td>
                      <td className="p-3 text-right text-green-600">${item.amountPaid.toLocaleString()}</td>
                      <td className="p-3 text-right text-orange-600">${item.outstanding.toLocaleString()}</td>
                      <td className="p-3 text-right text-destructive">${item.penalties.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold">${item.totalDue.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-bold">
                    <td className="p-3">Total</td>
                    <td className="p-3 text-right">
                      ${requisition.liabilityStatement.contributionBreakdown.reduce((sum, item) => sum + item.amountDue, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-green-600">
                      ${requisition.liabilityStatement.contributionBreakdown.reduce((sum, item) => sum + item.amountPaid, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-orange-600">
                      ${requisition.liabilityStatement.contributionBreakdown.reduce((sum, item) => sum + item.outstanding, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      ${requisition.liabilityStatement.contributionBreakdown.reduce((sum, item) => sum + item.penalties, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      ${requisition.liabilityStatement.contributionBreakdown.reduce((sum, item) => sum + item.totalDue, 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Separator className="my-6" />

            <h4 className="font-semibold mb-4">Period-by-Period Financial Breakdown</h4>
            <div className="text-sm text-muted-foreground mb-4">Detailed financial data for each period of arrears</div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">Period</th>
                    <th className="text-right p-3 text-sm font-medium">SSC Amount</th>
                    <th className="text-right p-3 text-sm font-medium">SSF Amount</th>
                    <th className="text-right p-3 text-sm font-medium">Penalties</th>
                    <th className="text-right p-3 text-sm font-medium">Period Total</th>
                  </tr>
                </thead>
                <tbody>
                  {requisition.liabilityStatement.periodBreakdown.map((period, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-3 font-medium">{period.period}</td>
                      <td className="p-3 text-right">${period.sscAmount.toLocaleString()}</td>
                      <td className="p-3 text-right">${period.ssfAmount.toLocaleString()}</td>
                      <td className="p-3 text-right text-destructive">${period.penalties.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold">${period.periodTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-bold">
                    <td className="p-3">Total Across All Periods</td>
                    <td className="p-3 text-right">
                      ${requisition.liabilityStatement.periodBreakdown.reduce((sum, p) => sum + p.sscAmount, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      ${requisition.liabilityStatement.periodBreakdown.reduce((sum, p) => sum + p.ssfAmount, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      ${requisition.liabilityStatement.periodBreakdown.reduce((sum, p) => sum + p.penalties, 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      ${requisition.liabilityStatement.periodBreakdown.reduce((sum, p) => sum + p.periodTotal, 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Separator className="my-6" />

            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <div className="text-amber-700 text-lg">⚠️</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-amber-900 mb-2">Important Notes:</h5>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>There are penalties accrued on outstanding contributions</li>
                    <li>Total to be paid in full at the time of each month if contributors are not paid in full</li>
                    <li><strong>SSC = Social Security Contributions, SSF = Social Security Fines</strong></li>
                    <li><strong>NRSD Levy (LV) = NRSD Levy Contributions, PE = NRSD Levy Penalties</strong></li>
                    <li><strong>Severance (PE) = Severance Act Contributions, PE = Severance Penalties</strong></li>
                  </ul>
                </div>
              </div>
            </Card>

            <Separator className="my-6" />

            <h4 className="font-semibold mb-4">Legal Action Details</h4>
            <div className="grid grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Period of Arrears</div>
                <div className="font-medium">{requisition.legalActionDetails.periodsOfArrears}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Number of Affected Employees</div>
                <div className="font-medium">{requisition.legalActionDetails.numberOfAffectedEmployees} employees</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground mb-1">Reason for Legal Action</div>
                <div className="font-medium">{requisition.legalActionDetails.reasonForLegalAction}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground mb-1">Particulars</div>
                <div className="text-sm">{requisition.legalActionDetails.particulars}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Attached Documents</h3>
            
            {requisition.documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No documents attached</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requisition.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        <div className="text-sm text-muted-foreground">{doc.size}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
