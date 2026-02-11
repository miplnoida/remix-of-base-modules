import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function EditC3Record() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const originalRecord = getMockRecord(id || "");
  
  const [formData, setFormData] = useState(originalRecord);

  const handleSave = () => {
    // In real app, this would save to API
    toast({
      title: "Record Updated",
      description: "C3 record has been successfully updated.",
    });
    navigate(-1);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
            <h1 className="text-3xl font-bold tracking-tight">Edit C3 Record</h1>
            <p className="text-muted-foreground">Record ID: {formData.scheduleNo}</p>
          </div>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Edit Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payerId">Payer ID</Label>
                <Input
                  id="payerId"
                  value={formData.payerId}
                  onChange={(e) => handleInputChange('payerId', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleNo">Schedule No.</Label>
                <Input
                  id="scheduleNo"
                  value={formData.scheduleNo}
                  onChange={(e) => handleInputChange('scheduleNo', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Input
                  id="period"
                  value={formData.period}
                  onChange={(e) => handleInputChange('period', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Employer">Employer</SelectItem>
                    <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                    <SelectItem value="Voluntary Contribution">Voluntary Contributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="payerName">Payer Name</Label>
                <Input
                  id="payerName"
                  value={formData.payerName}
                  onChange={(e) => handleInputChange('payerName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
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
              <div className="space-y-2">
                <Label htmlFor="dateReceived">Date Received</Label>
                <Input
                  id="dateReceived"
                  type="date"
                  value={formData.dateReceived}
                  onChange={(e) => handleInputChange('dateReceived', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateEntered">Date Entered</Label>
                <Input
                  id="dateEntered"
                  type="date"
                  value={formData.dateEntered}
                  onChange={(e) => handleInputChange('dateEntered', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="enteredBy">Entered By</Label>
                <Input
                  id="enteredBy"
                  value={formData.enteredBy}
                  onChange={(e) => handleInputChange('enteredBy', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateVerified">Date Verified</Label>
                <Input
                  id="dateVerified"
                  type="date"
                  value={formData.dateVerified}
                  onChange={(e) => handleInputChange('dateVerified', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="verifiedBy">Verified By</Label>
                <Input
                  id="verifiedBy"
                  value={formData.verifiedBy}
                  onChange={(e) => handleInputChange('verifiedBy', e.target.value)}
                />
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
              <div className="space-y-2">
                <Label htmlFor="cnc3ReceivedBy">CNC3 Received By</Label>
                <Input
                  id="cnc3ReceivedBy"
                  value={formData.cnc3ReportedReceivedBy}
                  onChange={(e) => handleInputChange('cnc3ReportedReceivedBy', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnc3ModifiedDate">CNC3 Modified Date</Label>
                <Input
                  id="cnc3ModifiedDate"
                  type="date"
                  value={formData.cnc3ReportedModifiedDate}
                  onChange={(e) => handleInputChange('cnc3ReportedModifiedDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnc3ModifiedBy">CNC3 Modified By</Label>
                <Input
                  id="cnc3ModifiedBy"
                  value={formData.cnc3ReportedModifiedBy}
                  onChange={(e) => handleInputChange('cnc3ReportedModifiedBy', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}