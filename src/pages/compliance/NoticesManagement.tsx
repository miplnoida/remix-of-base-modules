import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  Send, 
  FileText, 
  Clock, 
  Search,
  Filter,
  Plus
} from "lucide-react";
import { MOCK_NOTICES } from "@/services/mockData/complianceData";
import { useState } from "react";

export default function NoticesManagement() {
  const [searchTerm, setSearchTerm] = useState("");

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
                        {notice.caseId}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notice.subject}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getNoticeTypeColor(notice.noticeType)}>
                      {notice.noticeType.replace(/_/g, " ")}
                    </Badge>
                    <Badge className="bg-green-500">
                      SENT
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Issued</p>
                      <p className="font-medium text-foreground">{notice.issuedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Due Date</p>
                      <p className="font-medium text-foreground">{notice.issuedDate || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Template</p>
                      <p className="font-medium text-foreground">{notice.noticeType}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline">View Notice</Button>
                  <Button size="sm" variant="outline">Download PDF</Button>
                  <Button size="sm" className="gap-2">
                    <Send className="h-4 w-4" />
                    Resend Notice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
