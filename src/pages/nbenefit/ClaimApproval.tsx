import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Filter, CheckCircle, XCircle, FileText, AlertCircle } from "lucide-react";
import { BENEFIT_APPLICATIONS } from "@/services/mockData/benefitApplications";

interface EligibilityCheck {
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_REVIEW';
  reasons: string[];
  autoChecks: {
    contributionCheck: boolean;
    documentCheck: boolean;
    ageCheck: boolean;
    employmentCheck: boolean;
  };
}

export default function ClaimApproval() {
  const [searchTerm, setSearchTerm] = useState("");
  const [benefitTypeFilter, setBenefitTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showLetterDialog, setShowLetterDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Mock eligibility checking function
  const checkEligibility = (application: any): EligibilityCheck => {
    const reasons: string[] = [];
    const autoChecks = {
      contributionCheck: true,
      documentCheck: true,
      ageCheck: true,
      employmentCheck: true,
    };

    // Simulate eligibility checks based on benefit type
    if (application.benefitType === 'Sickness Benefit') {
      if (!application.claimAmount || application.claimAmount < 300) {
        reasons.push('Insufficient contribution weeks');
        autoChecks.contributionCheck = false;
      }
    }

    if (application.benefitType === 'Age Benefit') {
      if (application.insuredPersonSSN.includes('890')) {
        reasons.push('Age requirement not met (minimum 62 years)');
        autoChecks.ageCheck = false;
      }
    }

    if (application.benefitType === 'Maternity Benefit') {
      if (!application.reviewedBy) {
        reasons.push('Medical certificate not verified');
        autoChecks.documentCheck = false;
      }
    }

    const allChecksPassed = Object.values(autoChecks).every(check => check);
    
    return {
      status: allChecksPassed ? 'ELIGIBLE' : reasons.length > 2 ? 'NOT_ELIGIBLE' : 'NEEDS_REVIEW',
      reasons: allChecksPassed ? ['All eligibility criteria met'] : reasons,
      autoChecks,
    };
  };

  const filteredApplications = BENEFIT_APPLICATIONS.filter(app => {
    const matchesSearch = 
      app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.insuredPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.insuredPersonSSN.includes(searchTerm);

    const matchesBenefitType = benefitTypeFilter === "all" || app.benefitType === benefitTypeFilter;
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    
    const matchesDateFrom = !dateFrom || new Date(app.applicationDate) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(app.applicationDate) <= new Date(dateTo);

    return matchesSearch && matchesBenefitType && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const handleApprove = () => {
    console.log('Approving claim:', selectedClaim?.id, 'Notes:', approvalNotes);
    setShowApprovalDialog(false);
    setSelectedClaim(null);
    setApprovalNotes("");
  };

  const handleReject = () => {
    console.log('Rejecting claim:', selectedClaim?.id, 'Reason:', rejectionReason);
    setShowLetterDialog(true);
  };

  const generateNonEligibilityLetter = () => {
    const eligibility = checkEligibility(selectedClaim);
    const letterContent = `
SOCIAL SECURITY BOARD
NON-ELIGIBILITY NOTIFICATION

Date: ${new Date().toLocaleDateString()}
Application No: ${selectedClaim?.applicationNumber}
Applicant: ${selectedClaim?.insuredPersonName}
SSN: ${selectedClaim?.insuredPersonSSN}
Benefit Type: ${selectedClaim?.benefitType}

Dear ${selectedClaim?.insuredPersonName},

This letter is to inform you that your application for ${selectedClaim?.benefitType} has been reviewed and unfortunately does not meet the eligibility criteria at this time.

Reasons for Non-Eligibility:
${eligibility.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Additional Notes:
${rejectionReason}

Eligibility Checks Performed:
- Contribution Requirements: ${eligibility.autoChecks.contributionCheck ? 'Passed' : 'Failed'}
- Document Verification: ${eligibility.autoChecks.documentCheck ? 'Passed' : 'Failed'}
- Age Requirements: ${eligibility.autoChecks.ageCheck ? 'Passed' : 'Failed'}
- Employment Status: ${eligibility.autoChecks.employmentCheck ? 'Passed' : 'Failed'}

You have the right to appeal this decision within 30 days from the date of this letter.

Sincerely,
Benefits Review Officer
Social Security Board
    `.trim();

    // Create a blob and download
    const blob = new Blob([letterContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Non-Eligibility-Letter-${selectedClaim?.applicationNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setShowLetterDialog(false);
    setShowApprovalDialog(false);
    setSelectedClaim(null);
    setRejectionReason("");
  };

  const getEligibilityBadge = (eligibility: EligibilityCheck) => {
    if (eligibility.status === 'ELIGIBLE') {
      return <Badge className="bg-[hsl(var(--primary))] text-white"><CheckCircle className="w-3 h-3 mr-1" />Eligible</Badge>;
    }
    if (eligibility.status === 'NOT_ELIGIBLE') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Not Eligible</Badge>;
    }
    return <Badge variant="outline" className="border-[hsl(var(--warning))] text-[hsl(var(--warning))]"><AlertCircle className="w-3 h-3 mr-1" />Review Needed</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[hsl(var(--foreground))]">Benefit Claims Approval</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">
          Review and approve benefit applications with automated eligibility checking
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] w-4 h-4" />
                <Input
                  placeholder="Search by application #, name, or SSN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={benefitTypeFilter} onValueChange={setBenefitTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Benefit Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Sickness Benefit">Sickness Benefit</SelectItem>
                <SelectItem value="Maternity Benefit">Maternity Benefit</SelectItem>
                <SelectItem value="Employment Injury Benefit">Employment Injury</SelectItem>
                <SelectItem value="Funeral Grant">Funeral Grant</SelectItem>
                <SelectItem value="Age Benefit">Age Benefit</SelectItem>
                <SelectItem value="Invalidity Benefit">Invalidity Benefit</SelectItem>
                <SelectItem value="Survivors Benefit">Survivors Benefit</SelectItem>
                <SelectItem value="Assistance Pension">Assistance Pension</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[hsl(var(--muted-foreground))] mb-1 block">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-[hsl(var(--muted-foreground))] mb-1 block">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application #</TableHead>
              <TableHead>Benefit Type</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>SSN</TableHead>
              <TableHead>Date Applied</TableHead>
              <TableHead>Claim Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Eligibility</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((application) => {
              const eligibility = checkEligibility(application);
              return (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">{application.applicationNumber}</TableCell>
                  <TableCell>{application.benefitType}</TableCell>
                  <TableCell>{application.insuredPersonName}</TableCell>
                  <TableCell>{application.insuredPersonSSN}</TableCell>
                  <TableCell>{application.applicationDate}</TableCell>
                  <TableCell>
                    {application.claimAmount ? `XCD ${application.claimAmount.toFixed(2)}` : 'TBD'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      application.status === 'Approved' ? 'default' :
                      application.status === 'Rejected' ? 'destructive' :
                      'outline'
                    }>
                      {application.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getEligibilityBadge(eligibility)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedClaim(application);
                        setShowApprovalDialog(true);
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Claim Application</DialogTitle>
            <DialogDescription>
              Application #{selectedClaim?.applicationNumber} - {selectedClaim?.benefitType}
            </DialogDescription>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-6">
              {/* Applicant Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Applicant Name</p>
                  <p className="font-medium">{selectedClaim.insuredPersonName}</p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">SSN</p>
                  <p className="font-medium">{selectedClaim.insuredPersonSSN}</p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Application Date</p>
                  <p className="font-medium">{selectedClaim.applicationDate}</p>
                </div>
                <div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">Claim Amount</p>
                  <p className="font-medium">
                    {selectedClaim.claimAmount ? `XCD ${selectedClaim.claimAmount.toFixed(2)}` : 'TBD'}
                  </p>
                </div>
              </div>

              {/* Automated Eligibility Check */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-[hsl(var(--primary))]" />
                  Automated Eligibility Check
                </h3>
                {(() => {
                  const eligibility = checkEligibility(selectedClaim);
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Overall Status:</span>
                        {getEligibilityBadge(eligibility)}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          {eligibility.autoChecks.contributionCheck ? 
                            <CheckCircle className="w-5 h-5 text-[hsl(var(--primary))]" /> :
                            <XCircle className="w-5 h-5 text-destructive" />
                          }
                          <span>Contribution Check</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {eligibility.autoChecks.documentCheck ? 
                            <CheckCircle className="w-5 h-5 text-[hsl(var(--primary))]" /> :
                            <XCircle className="w-5 h-5 text-destructive" />
                          }
                          <span>Document Verification</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {eligibility.autoChecks.ageCheck ? 
                            <CheckCircle className="w-5 h-5 text-[hsl(var(--primary))]" /> :
                            <XCircle className="w-5 h-5 text-destructive" />
                          }
                          <span>Age Requirements</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {eligibility.autoChecks.employmentCheck ? 
                            <CheckCircle className="w-5 h-5 text-[hsl(var(--primary))]" /> :
                            <XCircle className="w-5 h-5 text-destructive" />
                          }
                          <span>Employment Status</span>
                        </div>
                      </div>

                      <div className="p-3 bg-[hsl(var(--muted))] rounded">
                        <p className="text-sm font-medium mb-2">Findings:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {eligibility.reasons.map((reason, idx) => (
                            <li key={idx} className="text-sm">{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Notes Section */}
              <div>
                <label className="text-sm font-medium mb-2 block">Reviewer Notes</label>
                <Textarea
                  placeholder="Enter your notes or observations..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Rejection Reason (shown when rejecting) */}
              {rejectionReason !== undefined && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Rejection Reason</label>
                  <Textarea
                    placeholder="Enter detailed reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowApprovalDialog(false);
              setSelectedClaim(null);
              setApprovalNotes("");
              setRejectionReason("");
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <XCircle className="w-4 h-4 mr-2" />
              Reject & Generate Letter
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Letter Generation Dialog */}
      <Dialog open={showLetterDialog} onOpenChange={setShowLetterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Non-Eligibility Letter</DialogTitle>
            <DialogDescription>
              This will generate and download a formal non-eligibility letter for the applicant.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              The letter will include:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Application details</li>
              <li>Automated eligibility check results</li>
              <li>Specific reasons for non-eligibility</li>
              <li>Your additional notes</li>
              <li>Appeal rights information</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLetterDialog(false)}>
              Cancel
            </Button>
            <Button onClick={generateNonEligibilityLetter}>
              <FileText className="w-4 h-4 mr-2" />
              Generate & Download Letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
