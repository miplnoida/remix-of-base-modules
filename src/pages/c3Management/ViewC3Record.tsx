import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer } from "lucide-react";

// Mock data - in real app this would come from API
const getMockRecord = (id: string) => ({
  payerId: "EMP001",
  scheduleNo: "SCH-2024-001",
  period: "2024-01",
  dateReceived: "2024-01-15",
  enteredBy: "John Smith",
  verifiedBy: "Jane Doe",
  dateEntered: "2024-01-16",
  dateVerified: "2024-01-17",
  status: "Verified",
  type: "Employer",
  payerName: "ABC Company Ltd",
  cnc3ReportedReceivedBy: "System Admin",
  cnc3ReportedModifiedDate: "2024-01-17",
  cnc3ReportedModifiedBy: "Jane Doe",
  amount: 15750.00
});

export default function ViewC3Record() {
  const { id } = useParams();
  const navigate = useNavigate();
  const record = getMockRecord(id || "");

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">View C3 Record</h1>
            <p className="text-muted-foreground">Record ID: {record.scheduleNo}</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Record Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payer ID</label>
                <p className="font-medium">{record.payerId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Schedule No.</label>
                <p className="font-medium">{record.scheduleNo}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Period</label>
                <p className="font-medium">{record.period}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <p className="font-medium">{record.type}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Payer Name</label>
                <p className="font-medium">{record.payerName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="font-medium text-lg">${record.amount.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">{getStatusBadge(record.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date Received</label>
                <p className="font-medium">{record.dateReceived}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date Entered</label>
                <p className="font-medium">{record.dateEntered}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Entered By</label>
                <p className="font-medium">{record.enteredBy}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date Verified</label>
                <p className="font-medium">{record.dateVerified || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Verified By</label>
                <p className="font-medium">{record.verifiedBy || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>CNC3 Report Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">CNC3 Received By</label>
                <p className="font-medium">{record.cnc3ReportedReceivedBy}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">CNC3 Modified Date</label>
                <p className="font-medium">{record.cnc3ReportedModifiedDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">CNC3 Modified By</label>
                <p className="font-medium">{record.cnc3ReportedModifiedBy}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}