import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertCircle, FileText, Download } from "lucide-react";
import { BENEFIT_APPLICATIONS, BenefitApplication } from "@/services/mockData/benefitApplications";
import { BenefitEligibilityService } from "@/services/benefitEligibilityService";
import { EligibilityResult } from "@/types/benefitsWorkflow";
import { toast } from "sonner";

const ClaimApprovalEnhanced = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<BenefitApplication | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [showEligibilityDialog, setShowEligibilityDialog] = useState(false);

  // Filter applications
  const filteredApplications = useMemo(() => {
    return BENEFIT_APPLICATIONS.filter((app) => {
      const matchesSearch =
        searchTerm === "" ||
        app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.insuredPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.insuredPersonSSN.includes(searchTerm);

      const matchesType =
        selectedType === "all" || app.benefitType === selectedType;

      const matchesStatus =
        selectedStatus === "all" || app.status === selectedStatus;

      const matchesDateFrom =
        !dateFrom || new Date(app.applicationDate) >= new Date(dateFrom);

      const matchesDateTo =
        !dateTo || new Date(app.applicationDate) <= new Date(dateTo);

      return matchesSearch && matchesType && matchesStatus && matchesDateFrom && matchesDateTo;
    });
  }, [searchTerm, selectedType, selectedStatus, dateFrom, dateTo]);

  // Get unique benefit types
  const benefitTypes = useMemo(() => {
    return Array.from(new Set(BENEFIT_APPLICATIONS.map((app) => app.benefitType)));
  }, []);

  const handleCheckEligibility = (application: BenefitApplication) => {
    const result = BenefitEligibilityService.checkEligibility(application);
    setEligibilityResult(result);
    setSelectedApplication(application);
    setShowEligibilityDialog(true);
  };

  const handleApprove = (application: BenefitApplication) => {
    toast.success(`Application ${application.applicationNumber} approved successfully`);
  };

  const handleReject = (application: BenefitApplication) => {
    const result = BenefitEligibilityService.checkEligibility(application);
    if (!result.eligible) {
      const letter = BenefitEligibilityService.generateNonEligibilityLetter(application, result);
      console.log("Non-Eligibility Letter:", letter);
      toast.success(`Rejection letter generated for ${application.applicationNumber}`);
    }
    toast.info(`Application ${application.applicationNumber} rejected`);
  };

  const handleDownloadLetter = () => {
    if (selectedApplication && eligibilityResult) {
      const letter = BenefitEligibilityService.generateNonEligibilityLetter(
        selectedApplication,
        eligibilityResult
      );
      const blob = new Blob([letter], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Non-Eligibility-${selectedApplication.applicationNumber}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Letter downloaded successfully");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Draft: "outline",
      Submitted: "secondary",
      "Under Review": "default",
      Approved: "default",
      Rejected: "destructive",
      "Payment Pending": "secondary",
      Completed: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Claims Approval</h1>
        <p className="text-muted-foreground mt-2">
          Review and approve benefit applications with automated eligibility verification
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter Claims</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Search by Application #, Name, or SSN"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Benefit Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {benefitTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredApplications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredApplications.filter((a) => a.status === "Submitted").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredApplications.filter((a) => a.status === "Under Review").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredApplications.filter((a) => a.status === "Approved").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Benefit Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application #</TableHead>
                  <TableHead>Benefit Type</TableHead>
                  <TableHead>Applicant Name</TableHead>
                  <TableHead>SSN</TableHead>
                  <TableHead>Application Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Claim Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No applications found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.applicationNumber}</TableCell>
                      <TableCell>{app.benefitType}</TableCell>
                      <TableCell>{app.insuredPersonName}</TableCell>
                      <TableCell>{app.insuredPersonSSN}</TableCell>
                      <TableCell>
                        {new Date(app.applicationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        {app.claimAmount ? `XCD $${app.claimAmount.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckEligibility(app)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Check Eligibility
                        </Button>
                        {app.status === "Submitted" || app.status === "Under Review" ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(app)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(app)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility Check Dialog */}
      <Dialog open={showEligibilityDialog} onOpenChange={setShowEligibilityDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eligibility Check Results</DialogTitle>
            <DialogDescription>
              Application: {selectedApplication?.applicationNumber} —{" "}
              {selectedApplication?.insuredPersonName}
            </DialogDescription>
          </DialogHeader>

          {eligibilityResult && (
            <div className="space-y-6">
              {/* Overall Result */}
              <Card className={eligibilityResult.eligible ? "border-green-500" : "border-red-500"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {eligibilityResult.eligible ? (
                      <>
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        <span className="text-green-600">ELIGIBLE</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-6 w-6 text-red-600" />
                        <span className="text-red-600">NOT ELIGIBLE</span>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!eligibilityResult.eligible && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-destructive">Failure Reasons:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {eligibilityResult.failureReasons.map((reason, index) => (
                          <li key={index} className="text-sm">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {eligibilityResult.warnings.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        Warnings:
                      </h4>
                      <ul className="list-disc list-inside space-y-1">
                        {eligibilityResult.warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-yellow-700">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detailed Checks */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Eligibility Checks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {eligibilityResult.checks.map((check) => (
                    <div
                      key={check.id}
                      className={`p-4 rounded-lg border ${
                        check.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {check.passed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className="font-semibold">{check.checkType} Check</span>
                        </div>
                        <Badge variant={check.passed ? "default" : "destructive"}>
                          {check.passed ? "PASSED" : "FAILED"}
                        </Badge>
                      </div>
                      {check.reason && (
                        <p className="text-sm mt-2 text-muted-foreground">{check.reason}</p>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Required:</span>
                          <pre className="mt-1 text-xs bg-white p-2 rounded">
                            {JSON.stringify(check.details.required, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="font-medium">Actual:</span>
                          <pre className="mt-1 text-xs bg-white p-2 rounded">
                            {JSON.stringify(check.details.actual, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                {!eligibilityResult.eligible && (
                  <Button onClick={handleDownloadLetter} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Non-Eligibility Letter
                  </Button>
                )}
                <Button onClick={() => setShowEligibilityDialog(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClaimApprovalEnhanced;
