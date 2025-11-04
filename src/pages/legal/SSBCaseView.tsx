import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Plus, Upload, MoreVertical, Calendar, CheckSquare, FileText, Users, Scale, MessageSquare, Shield, DollarSign, Gavel, Clock, Activity } from "lucide-react";
import { useLegalCases } from "@/contexts/LegalCaseContext";
import { StatusBadge } from "@/components/legal/StatusBadge";
import { TypeBadge } from "@/components/legal/TypeBadge";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CaseOverviewTab } from "@/components/legal/tabs/CaseOverviewTab";
import { CasePartiesTab } from "@/components/legal/tabs/CasePartiesTab";
import { CaseDocumentsTab } from "@/components/legal/tabs/CaseDocumentsTab";
import { CaseHearingsTab } from "@/components/legal/tabs/CaseHearingsTab";
import { CaseCorrespondenceTab } from "@/components/legal/tabs/CaseCorrespondenceTab";
import { CaseEvidenceTab } from "@/components/legal/tabs/CaseEvidenceTab";
import { CaseOrdersTab } from "@/components/legal/tabs/CaseOrdersTab";
import { CaseFinancialsTab } from "@/components/legal/tabs/CaseFinancialsTab";
import { CaseTimelineTab } from "@/components/legal/tabs/CaseTimelineTab";
import { CaseNotesTab } from "@/components/legal/tabs/CaseNotesTab";
import { CaseAuditTab } from "@/components/legal/tabs/CaseAuditTab";
import { ScheduleHearingDialog } from "@/components/legal/ScheduleHearingDialog";
import { CreateTaskDialog } from "@/components/legal/CreateTaskDialog";
import { IssueNoticeDialog } from "@/components/legal/IssueNoticeDialog";
import { ChangeStatusDialog } from "@/components/legal/ChangeStatusDialog";

export default function SSBCaseView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCaseById, updateCase } = useLegalCases();
  const [activeTab, setActiveTab] = useState("overview");
  const [scheduleHearingOpen, setScheduleHearingOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [issueNoticeOpen, setIssueNoticeOpen] = useState(false);
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);

  const caseData = id ? getCaseById(id) : undefined;

  const handleScheduleHearing = (caseId: string, hearing: any) => {
    if (id) {
      updateCase(id, {
        hearings: [...(caseData?.hearings || []), hearing]
      });
    }
  };

  const handleCreateTask = (caseId: string, task: any) => {
    toast.success('Task created successfully');
  };

  const handleIssueNotice = (caseId: string, notice: any) => {
    toast.success('Notice issued successfully');
  };

  const handleChangeStatus = (newStatus: string, notes: string) => {
    if (id) {
      updateCase(id, { status: newStatus });
    }
  };

  if (!caseData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Case not found</h2>
          <Button onClick={() => navigate('/legal/cases')}>Back to Cases</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="">
        <div className=" mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
            <Button 
            variant="outline" 
            onClick={() => navigate('/person/management')}
            className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
           
            <span className="sm:hidden">Back</span>
          </Button>
              <h1 className="text-xl md:text-2xl font-bold text-foreground truncate mt-5">
                {caseData.number} · {caseData.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusBadge status={caseData.status} />
                <TypeBadge type={caseData.type} />
                <span className="text-sm text-muted-foreground">Assigned to: {caseData.assignee}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/legal/cases/${id}/edit`)} className="gap-2">
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIssueNoticeOpen(true)}>
                    <FileText className="h-4 w-4 mr-2" />Issue Notice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setChangeStatusOpen(true)}>
                    <Activity className="h-4 w-4 mr-2" />Change Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-4 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b overflow-x-auto">
            <TabsList className="inline-flex h-auto p-0  w-full justify-start">
              <TabsTrigger value="overview" className="gap-2"><FileText className="h-4 w-4" />Overview</TabsTrigger>
              <TabsTrigger value="parties" className="gap-2"><Users className="h-4 w-4" />Parties</TabsTrigger>
              <TabsTrigger value="documents" className="gap-2"><FileText className="h-4 w-4" />Documents</TabsTrigger>
              <TabsTrigger value="hearings" className="gap-2"><Calendar className="h-4 w-4" />Hearings</TabsTrigger>
              <TabsTrigger value="correspondence" className="gap-2"><MessageSquare className="h-4 w-4" />Correspondence</TabsTrigger>
              <TabsTrigger value="evidence" className="gap-2"><Shield className="h-4 w-4" />Evidence</TabsTrigger>
              <TabsTrigger value="orders" className="gap-2"><Gavel className="h-4 w-4" />Orders</TabsTrigger>
              <TabsTrigger value="financials" className="gap-2"><DollarSign className="h-4 w-4" />Financials</TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2"><Clock className="h-4 w-4" />Timeline</TabsTrigger>
              <TabsTrigger value="notes" className="gap-2"><FileText className="h-4 w-4" />Notes</TabsTrigger>
              <TabsTrigger value="audit" className="gap-2"><Scale className="h-4 w-4" />Audit</TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-6">
            <TabsContent value="overview" className="mt-0"><CaseOverviewTab caseData={caseData} /></TabsContent>
            <TabsContent value="parties" className="mt-0"><CasePartiesTab caseData={caseData} /></TabsContent>
            <TabsContent value="documents" className="mt-0"><CaseDocumentsTab caseData={caseData} /></TabsContent>
            <TabsContent value="hearings" className="mt-0"><CaseHearingsTab caseData={caseData} /></TabsContent>
            <TabsContent value="correspondence" className="mt-0"><CaseCorrespondenceTab caseData={caseData} /></TabsContent>
            <TabsContent value="evidence" className="mt-0"><CaseEvidenceTab caseData={caseData} /></TabsContent>
            <TabsContent value="orders" className="mt-0"><CaseOrdersTab caseData={caseData} /></TabsContent>
            <TabsContent value="financials" className="mt-0"><CaseFinancialsTab caseData={caseData} /></TabsContent>
            <TabsContent value="timeline" className="mt-0"><CaseTimelineTab caseData={caseData} /></TabsContent>
            <TabsContent value="notes" className="mt-0"><CaseNotesTab caseData={caseData} /></TabsContent>
            <TabsContent value="audit" className="mt-0"><CaseAuditTab caseData={caseData} /></TabsContent>
          </div>
        </Tabs>
      </div>

      {id && (
        <>
          <ScheduleHearingDialog
            open={scheduleHearingOpen}
            onOpenChange={setScheduleHearingOpen}
            caseId={id}
            onSchedule={handleScheduleHearing}
          />
          <CreateTaskDialog
            open={createTaskOpen}
            onOpenChange={setCreateTaskOpen}
            caseId={id}
            onCreateTask={handleCreateTask}
          />
          <IssueNoticeDialog
            open={issueNoticeOpen}
            onOpenChange={setIssueNoticeOpen}
            caseId={id}
            onIssueNotice={handleIssueNotice}
          />
          <ChangeStatusDialog
            open={changeStatusOpen}
            onOpenChange={setChangeStatusOpen}
            currentStatus={caseData?.status || 'Draft'}
            onChangeStatus={handleChangeStatus}
          />
        </>
      )}
    </div>
  );
}
