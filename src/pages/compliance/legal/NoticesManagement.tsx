import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Bell, 
  Send, 
  FileText, 
  Clock, 
  Search,
  Filter,
  Plus,
  Eye,
  Download
} from "lucide-react";
import { MOCK_NOTICES } from "@/services/mockData/complianceData";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function NoticesManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);

  const filteredNotices = MOCK_NOTICES.filter(notice => 
    notice.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notice.caseId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getNoticeTypeColor = (type: string) => {
    switch (type) {
      case "LATE_C3": return "bg-yellow-500";
      case "C3_NOT_SUBMITTED": return "bg-orange-500";
      case "PAYMENT_NOT_RECEIVED": return "bg-red-500";
      case "FINAL_WARNING": return "bg-red-700";
      case "LEGAL_WARNING": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-green-500";
      case "pending": return "bg-yellow-500";
      case "draft": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const handleViewNotice = (notice: any) => {
    setSelectedNotice(notice);
    setViewDialogOpen(true);
  };

  const handleDownloadPDF = (notice: any) => {
    toast({
      title: "Downloading PDF",
      description: `Notice ${notice.noticeNumber} is being downloaded...`,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notices & Communication</h1>
          <p className="text-muted-foreground">
            Manage compliance notices and employer communications
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Notice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">24</div>
            <p className="text-sm text-muted-foreground">Pending Notices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">156</div>
            <p className="text-sm text-muted-foreground">Sent This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">8</div>
            <p className="text-sm text-muted-foreground">Final Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">3</div>
            <p className="text-sm text-muted-foreground">Legal Escalations</p>
          </CardContent>
        </Card>
      </div>

      {/* Notices List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employer or case number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          <div className="space-y-4">
            {filteredNotices.map((notice) => (
              <div 
                key={notice.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {notice.employerName}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {notice.noticeNumber}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Case: {notice.caseId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getNoticeTypeColor(notice.noticeType)}`} />
                    <span className="text-sm text-muted-foreground">
                      {notice.noticeType.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notice Type</p>
                    <p className="text-sm font-semibold text-foreground">
                      {notice.noticeType.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Issued Date</p>
                    <p className="text-sm font-semibold text-foreground">{notice.issuedDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Delivery Method</p>
                    <p className="text-sm font-semibold text-foreground">{notice.deliveryMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge className={getStatusColor(notice.deliveryStatus)}>
                      {notice.deliveryStatus}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewNotice(notice)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Notice
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownloadPDF(notice)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Notice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Notice Details</DialogTitle>
            <DialogDescription>
              {selectedNotice?.noticeNumber} - {selectedNotice?.noticeType.replace(/_/g, ' ')}
            </DialogDescription>
          </DialogHeader>

          {selectedNotice && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employer</Label>
                  <p className="font-medium">{selectedNotice.employerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Case ID</Label>
                  <p className="font-medium">{selectedNotice.caseId}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Notice Type</Label>
                  <p className="font-medium">{selectedNotice.noticeType.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Issued Date</Label>
                  <p className="font-medium">{selectedNotice.issuedDate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Method</Label>
                  <p className="font-medium">{selectedNotice.deliveryMethod}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(selectedNotice.deliveryStatus)}>
                    {selectedNotice.deliveryStatus}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Subject</Label>
                <Card className="mt-2">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium">{selectedNotice.subject}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label className="text-muted-foreground">Notice Body</Label>
                <Card className="mt-2">
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-line">{selectedNotice.body}</p>
                  </CardContent>
                </Card>
              </div>

              {selectedNotice.responseReceived && (
                <div>
                  <Label className="text-muted-foreground">Employer Response</Label>
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      <p className="text-sm">
                        Response received on {selectedNotice.responseDate}
                      </p>
                      {selectedNotice.responseNotes && (
                        <p className="text-sm mt-2 text-muted-foreground">
                          {selectedNotice.responseNotes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => handleDownloadPDF(selectedNotice)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
