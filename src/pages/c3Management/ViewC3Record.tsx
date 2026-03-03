import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Send, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useC3Submit } from "@/hooks/useC3Submit";
import { WorkflowActionButtons } from "@/components/workflow/WorkflowActionButtons";

interface C3RecordData {
  id: string;
  payerId: string;
  payerType: string;
  scheduleNo: string;
  period: string;
  dateReceived: string;
  enteredBy: string;
  verifiedBy: string | null;
  dateEntered: string;
  dateVerified: string | null;
  status: string;
  postingStatus: string;
  type: string;
  payerName: string;
  cnc3ReportedReceivedBy: string;
  cnc3ReportedModifiedDate: string;
  cnc3ReportedModifiedBy: string;
  amount: number;
}

export default function ViewC3Record() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { submitC3Record, isSubmitting } = useC3Submit();
  
  const [record, setRecord] = useState<C3RecordData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecord = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cn_c3_reported')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const postingStatus = data.posting_status;
        const statusMap: Record<string, string> = {
          'DFT': 'Draft', 'Z': 'Draft',
          'PEN': 'Pending', 'P': 'Pending',
          'VAC': 'Verified', 'V': 'Verified',
          'REJ': 'Rejected',
          'DEL': 'Deleted', 'D': 'Deleted',
        };
        
        setRecord({
          id: data.id,
          payerId: data.payer_id,
          payerType: data.payer_type,
          scheduleNo: `SCH-${data.sequence_no}`,
          period: data.period ? new Date(data.period).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '',
          dateReceived: data.date_received ? new Date(data.date_received).toLocaleDateString('en-GB') : '',
          enteredBy: data.entered_by || '',
          verifiedBy: data.verified_by || null,
          dateEntered: data.date_entered ? new Date(data.date_entered).toLocaleDateString('en-GB') : '',
          dateVerified: data.date_verified ? new Date(data.date_verified).toLocaleDateString('en-GB') : null,
          status: statusMap[postingStatus] || postingStatus,
          postingStatus: postingStatus,
          type: data.payer_type === 'ER' ? 'Employer' : data.payer_type === 'SE' ? 'Self-Employed' : 'Voluntary',
          payerName: data.payer_name || '',
          cnc3ReportedReceivedBy: data.received_by || '',
          cnc3ReportedModifiedDate: data.modified_date ? new Date(data.modified_date).toLocaleDateString('en-GB') : '',
          cnc3ReportedModifiedBy: data.modified_by || '',
          amount: (data.emp_ss_amt_calc || 0) + (data.emp_levy_amt_calc || 0) + (data.emp_pe_amt_calc || 0),
        });
      }
    } catch (error) {
      console.error('Error fetching C3 record:', error);
      toast({
        title: "Error",
        description: "Failed to load C3 record.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async () => {
    if (!record) return;
    
    const recordName = record.payerName || `${record.payerId} - ${record.scheduleNo}`;
    const result = await submitC3Record(record.id, record.payerType, recordName);
    
    if (result.success) {
      toast({
        title: "C3 Submitted",
        description: result.message || "C3 record has been submitted for approval.",
      });
      fetchRecord();
    } else {
      toast({
        title: "Submission Failed",
        description: result.error || "Failed to submit C3 record.",
        variant: "destructive",
      });
    }
  };

  const handleWorkflowActionComplete = useCallback((action: string, endState: string | null) => {
    toast({
      title: "Workflow Action Completed",
      description: `Action "${action}" completed successfully.${endState ? ` Status: ${endState}` : ''}`,
    });
    fetchRecord();
  }, [toast, fetchRecord]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-success/10 text-success">Verified</Badge>;
      case "Pending":
        return <Badge className="bg-warning/15 text-warning">Pending</Badge>;
      case "Draft":
        return <Badge className="bg-info/10 text-info">Draft</Badge>;
      case "Rejected":
        return <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading C3 record...</span>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground mb-4">C3 record not found.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const isDraft = record.postingStatus === 'DFT' || record.postingStatus === 'Z';
  const sourceModule = `c3_${(record.payerType || 'er').toLowerCase()}_submission`;

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
        <div className="flex items-center gap-2">
          {/* Submit button for Draft records */}
          {isDraft && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              variant="outline"
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit
            </Button>
          )}
          
          {/* Workflow action buttons for submitted records */}
          {!isDraft && (
            <WorkflowActionButtons
              sourceModule={sourceModule}
              sourceRecordId={record.id}
              onActionComplete={handleWorkflowActionComplete}
            />
          )}
          
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
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
