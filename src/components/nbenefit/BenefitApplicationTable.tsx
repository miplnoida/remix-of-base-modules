import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, FileText } from "lucide-react";
import { BenefitApplication } from "@/services/mockData/benefitApplications";

interface BenefitApplicationTableProps {
  applications: BenefitApplication[];
  benefitType?: string;
}

export default function BenefitApplicationTable({ applications, benefitType }: BenefitApplicationTableProps) {
  const [selectedApplication, setSelectedApplication] = useState<BenefitApplication | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const filteredApplications = benefitType
    ? applications.filter(app => app.benefitType === benefitType)
    : applications;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Completed': 'default',
      'Approved': 'default',
      'Payment Pending': 'secondary',
      'Under Review': 'secondary',
      'Submitted': 'outline',
      'Rejected': 'destructive',
      'Draft': 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const handleViewDetails = (app: BenefitApplication) => {
    setSelectedApplication(app);
    setShowDetailsDialog(true);
  };

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application #</TableHead>
              <TableHead>Applicant Name</TableHead>
              <TableHead>SSN</TableHead>
              <TableHead>Application Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Claim Amount</TableHead>
              <TableHead>Approved Amount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-[hsl(var(--muted-foreground))] py-8">
                  No applications found
                </TableCell>
              </TableRow>
            ) : (
              filteredApplications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.applicationNumber}</TableCell>
                  <TableCell>{app.insuredPersonName}</TableCell>
                  <TableCell>{app.insuredPersonSSN}</TableCell>
                  <TableCell>{app.applicationDate}</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>
                    {app.claimAmount ? `XCD ${app.claimAmount.toFixed(2)}` : 'TBD'}
                  </TableCell>
                  <TableCell>
                    {app.approvedAmount ? `XCD ${app.approvedAmount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(app)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              {selectedApplication?.applicationNumber} - {selectedApplication?.benefitType}
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Applicant Name</p>
                    <p className="font-medium">{selectedApplication.insuredPersonName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">SSN</p>
                    <p className="font-medium">{selectedApplication.insuredPersonSSN}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Phone</p>
                    <p className="font-medium">{selectedApplication.contactPhone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Email</p>
                    <p className="font-medium">{selectedApplication.contactEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Application Date</p>
                    <p className="font-medium">{selectedApplication.applicationDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">Status</p>
                    <p>{getStatusBadge(selectedApplication.status)}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              {(selectedApplication.claimAmount || selectedApplication.approvedAmount) && (
                <div>
                  <h3 className="font-semibold mb-3">Financial Information</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                    {selectedApplication.claimAmount && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Claim Amount</p>
                        <p className="font-medium">XCD {selectedApplication.claimAmount.toFixed(2)}</p>
                      </div>
                    )}
                    {selectedApplication.approvedAmount && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Approved Amount</p>
                        <p className="font-medium">XCD {selectedApplication.approvedAmount.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sickness Benefit Specific */}
              {selectedApplication.benefitType === 'Sickness Benefit' && (
                <div>
                  <h3 className="font-semibold mb-3">Sickness Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Employer</p>
                      <p className="font-medium">{selectedApplication.employerName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Last Day Worked</p>
                      <p className="font-medium">{selectedApplication.lastDayWorked || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Expected Return Date</p>
                      <p className="font-medium">{selectedApplication.expectedReturnDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Diagnosis</p>
                      <p className="font-medium">{selectedApplication.diagnosis || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Doctor</p>
                      <p className="font-medium">{selectedApplication.doctorName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Medical Certificate Date</p>
                      <p className="font-medium">{selectedApplication.medicalCertificateDate || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Maternity Benefit Specific */}
              {selectedApplication.benefitType === 'Maternity Benefit' && (
                <div>
                  <h3 className="font-semibold mb-3">Maternity Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Expected Delivery Date</p>
                      <p className="font-medium">{selectedApplication.expectedDeliveryDate || 'N/A'}</p>
                    </div>
                    {selectedApplication.confinementDate && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Confinement Date</p>
                        <p className="font-medium">{selectedApplication.confinementDate}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Maternity Type</p>
                      <p className="font-medium">{selectedApplication.maternityType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Doctor</p>
                      <p className="font-medium">{selectedApplication.doctorName || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Employment Injury Specific */}
              {selectedApplication.benefitType === 'Employment Injury Benefit' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Injury Details</h3>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Injury Date</p>
                        <p className="font-medium">{selectedApplication.injuryDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Location</p>
                        <p className="font-medium">{selectedApplication.injuryLocation || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Description</p>
                        <p className="font-medium">{selectedApplication.injuryDescription || 'N/A'}</p>
                      </div>
                      {selectedApplication.witnessNames && selectedApplication.witnessNames.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Witnesses</p>
                          <p className="font-medium">{selectedApplication.witnessNames.join(', ')}</p>
                        </div>
                      )}
                      {selectedApplication.disabilityPercentage && (
                        <div>
                          <p className="text-sm text-[hsl(var(--muted-foreground))]">Disability Percentage</p>
                          <p className="font-medium">{selectedApplication.disabilityPercentage}%</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedApplication.medicalExpenses && selectedApplication.medicalExpenses.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Medical Expenses</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Provider</TableHead>
                              <TableHead>Service Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Invoice #</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedApplication.medicalExpenses.map((expense) => (
                              <TableRow key={expense.id}>
                                <TableCell>{expense.provider}</TableCell>
                                <TableCell>{expense.serviceDate}</TableCell>
                                <TableCell>{expense.description}</TableCell>
                                <TableCell>XCD {expense.amount.toFixed(2)}</TableCell>
                                <TableCell>{expense.invoiceNumber}</TableCell>
                                <TableCell>{getStatusBadge(expense.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-2 text-right">
                        <p className="font-semibold">
                          Total Medical Expenses: XCD {selectedApplication.medicalExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Funeral Grant Specific */}
              {selectedApplication.benefitType === 'Funeral Grant' && (
                <div>
                  <h3 className="font-semibold mb-3">Funeral Grant Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Deceased Name</p>
                      <p className="font-medium">{selectedApplication.deceasedName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Deceased SSN</p>
                      <p className="font-medium">{selectedApplication.deceasedSSN || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Death Date</p>
                      <p className="font-medium">{selectedApplication.deathDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Death Certificate #</p>
                      <p className="font-medium">{selectedApplication.deathCertificateNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Relationship</p>
                      <p className="font-medium">{selectedApplication.relationship || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Funeral Expenses</p>
                      <p className="font-medium">
                        {selectedApplication.funeralExpenses ? `XCD ${selectedApplication.funeralExpenses.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Age Benefit Specific */}
              {selectedApplication.benefitType === 'Age Benefit' && (
                <div>
                  <h3 className="font-semibold mb-3">Age Benefit Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Age</p>
                      <p className="font-medium">{selectedApplication.age || 'N/A'} years</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Contribution Weeks</p>
                      <p className="font-medium">{selectedApplication.contributionWeeks || 'N/A'} weeks</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Pension Type</p>
                      <p className="font-medium">{selectedApplication.pensionType || 'N/A'}</p>
                    </div>
                    {selectedApplication.pensionStartDate && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Pension Start Date</p>
                        <p className="font-medium">{selectedApplication.pensionStartDate}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Invalidity Benefit Specific */}
              {(selectedApplication.benefitType === 'Invalidity Benefit' || selectedApplication.benefitType === 'Invalidity Assistance') && (
                <div>
                  <h3 className="font-semibold mb-3">Invalidity Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Disability Start Date</p>
                      <p className="font-medium">{selectedApplication.disabilityStartDate || 'N/A'}</p>
                    </div>
                    {selectedApplication.medicalBoardDate && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Medical Board Date</p>
                        <p className="font-medium">{selectedApplication.medicalBoardDate}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Permanent Disability</p>
                      <p className="font-medium">{selectedApplication.permanentDisability ? 'Yes' : 'No'}</p>
                    </div>
                    {selectedApplication.diagnosis && (
                      <div className="col-span-2">
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Diagnosis</p>
                        <p className="font-medium">{selectedApplication.diagnosis}</p>
                      </div>
                    )}
                    {selectedApplication.doctorName && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Doctor</p>
                        <p className="font-medium">{selectedApplication.doctorName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Survivors Benefit Specific */}
              {selectedApplication.benefitType === 'Survivors Benefit' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Deceased Information</h3>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Deceased Name</p>
                        <p className="font-medium">{selectedApplication.deceasedName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Deceased SSN</p>
                        <p className="font-medium">{selectedApplication.deceasedSSN || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Death Date</p>
                        <p className="font-medium">{selectedApplication.deathDate || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Relationship</p>
                        <p className="font-medium">{selectedApplication.relationship || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedApplication.dependents && selectedApplication.dependents.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Dependents</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Relationship</TableHead>
                              <TableHead>Age</TableHead>
                              <TableHead>Student Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedApplication.dependents.map((dependent, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{dependent.name}</TableCell>
                                <TableCell>{dependent.relationship}</TableCell>
                                <TableCell>{dependent.age} years</TableCell>
                                <TableCell>{dependent.studentStatus ? 'Yes' : 'No'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Assistance/Non-Contributory Specific */}
              {(selectedApplication.benefitType === 'Assistance Pension' || 
                selectedApplication.benefitType === 'Assistance Benefit' ||
                selectedApplication.benefitType === 'Invalidity Assistance') && (
                <div>
                  <h3 className="font-semibold mb-3">Assistance Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                    {selectedApplication.age && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Age</p>
                        <p className="font-medium">{selectedApplication.age} years</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Income Proof Provided</p>
                      <p className="font-medium">{selectedApplication.incomeProofProvided ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Residence Proof Provided</p>
                      <p className="font-medium">{selectedApplication.residenceProofProvided ? 'Yes' : 'No'}</p>
                    </div>
                    {selectedApplication.unemploymentDeclared !== undefined && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Unemployment Declared</p>
                        <p className="font-medium">{selectedApplication.unemploymentDeclared ? 'Yes' : 'No'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Information */}
              {(selectedApplication.reviewedBy || selectedApplication.notes) && (
                <div>
                  <h3 className="font-semibold mb-3">Review Information</h3>
                  <div className="p-4 bg-[hsl(var(--muted))] rounded-lg space-y-2">
                    {selectedApplication.reviewedBy && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Reviewed By</p>
                        <p className="font-medium">{selectedApplication.reviewedBy}</p>
                      </div>
                    )}
                    {selectedApplication.reviewDate && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Review Date</p>
                        <p className="font-medium">{selectedApplication.reviewDate}</p>
                      </div>
                    )}
                    {selectedApplication.notes && (
                      <div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">Notes</p>
                        <p className="font-medium">{selectedApplication.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
