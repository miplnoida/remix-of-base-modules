import { Routes, Route, Navigate } from 'react-router-dom';

// Dashboards
import ManagerDashboard from './dashboards/ManagerDashboard';
import InspectorDashboard from './dashboards/InspectorDashboard';
import LegalDashboard from './dashboards/LegalDashboard';
import ComplianceMonitoring from './dashboards/ComplianceMonitoring';
import ComplianceAnalytics from './dashboards/ComplianceAnalytics';
import ComplianceCommandCenter from './dashboards/ComplianceCommandCenter';
import ComplianceHelpAdmin from './admin/ComplianceHelpAdmin';

// Violations
import ViolationsManagement from './violations/ViolationsManagement';
import ManualViolationEntry from './violations/ManualViolationEntry';
import ViolationDetails from './violations/ViolationDetails';
import WeeklyReportSubmission from './violations/WeeklyReportSubmission';
import VerificationQueue from './violations/VerificationQueue';
import DuplicateReview from './violations/DuplicateReview';
import RuleDetectedViolations from './violations/RuleDetectedViolations';
import ViolationHistory from './violations/ViolationHistory';

// Cases
import CaseManagement from './cases/CaseManagement';
import CaseQueue from './cases/CaseQueue';
import PenaltyManagement from './cases/PenaltyManagement';
import CaseIntake from './cases/CaseIntake';
import AssignedCases from './cases/AssignedCases';
import CaseClosurePage from './cases/CaseClosurePage';
import ReopenRequestsPage from './cases/ReopenRequestsPage';
import CaseMergeReviewPage from './cases/CaseMergeReviewPage';

// Inspections
import InspectionManagement from './inspections/InspectionManagement';
import FieldOperations from './inspections/FieldOperations';
import InspectionEvidencePage from './inspections/InspectionEvidencePage';
import ConvertFindingToViolationPage from './inspections/ConvertFindingToViolationPage';

// Arrangements
import PaymentArrangements from './arrangements/PaymentArrangements';
import BreachMonitoring from './arrangements/BreachMonitoring';
import AllArrangementsPage from './arrangements/AllArrangementsPage';
import NewArrangementPage from './arrangements/NewArrangementPage';
import ArrangementPendingApprovalPage from './arrangements/ArrangementPendingApprovalPage';
import ActiveArrangementsPage from './arrangements/ActiveArrangementsPage';
import InstallmentsDuePage from './arrangements/InstallmentsDuePage';
import BreachesPage from './arrangements/BreachesPage';
import PaymentAllocationPage from './arrangements/PaymentAllocationPage';

// Legal
import LegalQueue from './legal/LegalQueue';
import LegalProceedingsPage from './legal/LegalProceedingsPage';
import WaiversOverrides from './legal/WaiversOverrides';
import NoticesManagement from './legal/NoticesManagement';
import LegalRecommendationQueue from './legal/LegalRecommendationQueue';
import LegalReferralWizard from './legal/LegalReferralWizard';
import LegalPackPreparationPage from './legal/LegalPackPreparationPage';
import ApprovedEscalationsPage from './legal/ApprovedEscalationsPage';
import ReturnedFromLegalPage from './legal/ReturnedFromLegalPage';
import LegalHandoffRulesPage from './admin/LegalHandoffRulesPage';

// Risk & Employer Profile
import RiskScoreDetailsPage from './risk/RiskScoreDetailsPage';
import RepeatDefaultersPage from './risk/RepeatDefaultersPage';
import HighRiskEmployersPage from './risk/HighRiskEmployersPage';
import WatchlistPage from './risk/WatchlistPage';

// Notices & Communications
import NoticeRegister from './notices/NoticeRegister';
import GenerateNoticePage from './notices/GenerateNoticePage';
import PendingApprovalPage from './notices/PendingApprovalPage';
import DeliveryTrackingPage from './notices/DeliveryTrackingPage';
import EmployerResponsesPage from './notices/EmployerResponsesPage';
import CommunicationHistoryPage from './notices/CommunicationHistoryPage';

// Employers
import EmployerStatements from './employers/EmployerStatements';
import EmployerStatementDetail from './employers/EmployerStatementDetail';
// Removed: EmployerFinancialStatement (unclear ownership — will re-add if needed)
import EmployerFindings from './employers/EmployerFindings';
// Removed: EmployerComplianceManagement, EmployerHierarchy (unclear ownership — will re-add if needed)
import EmployerVisitWorkspace from './employers/EmployerVisitWorkspace';
import Employer360 from './employers/Employer360';
import Employer360Search from './employers/Employer360Search';

// Audit Planning
import WeeklyPlanBuilder from './audit-planning/WeeklyPlanBuilder';
import MyPlans from './audit-planning/MyPlans';
import FieldExecution from './audit-planning/FieldExecution';
import PendingReview from './audit-planning/PendingReview';
import { WeeklyPlanReview } from './audit-planning/WeeklyPlanReview';
import WeeklyReports from './audit-planning/WeeklyReports';
import AllWeeklyReports from './audit-planning/AllWeeklyReports';
import AuditDetails from './audit-planning/AuditDetails';
import AuditManagement from './audit-planning/AuditManagement';
import PlanExecutionDashboard from './audit-planning/PlanExecutionDashboard';
import EmployerAuditReportViewer from './audit-planning/EmployerAuditReportViewer';
import WeeklyReportReview from './audit-planning/WeeklyReportReview';

// Sampling
import SamplingDashboard from './sampling/SamplingDashboard';
import EmployerRiskProfile from './sampling/EmployerRiskProfile';
import MonthlyAuditCandidates from './sampling/MonthlyAuditCandidates';
import MyUpcomingAudits from './sampling/MyUpcomingAudits';
import RiskSamplingSettings from './sampling/RiskSamplingSettings';

// Automation
import JobConfiguration from './automation/JobConfiguration';
import JobHistory from './automation/JobHistory';
import EmployerComplianceJobs from './automation/EmployerComplianceJobs';

// Reports
import CaseAnalytics from './reports/CaseAnalytics';
import ViolationsByStatusReport from './reports/violations/ViolationsByStatus';
import ViolationsByTypeReport from './reports/violations/ViolationsByType';
import ViolationResolutionTimeReport from './reports/violations/ViolationResolutionTime';
import ViolationsByZoneReport from './reports/violations/ViolationsByZone';
import InspectorPerformance from './reports/InspectorPerformance';
import C3Compliance from './reports/C3Compliance';
import ArrearsReports from './reports/ArrearsReports';
import AuditReports from './reports/AuditReports';
import ArrangementReports from './reports/ArrangementReports';
import LegalEscalationReports from './reports/LegalEscalationReports';
import TrendReports from './reports/TrendReports';
import AutomationJobReports from './reports/AutomationJobReports';

// Settings
import RuleEngine from './settings/RuleEngine';
import ViolationTypes from './settings/ViolationTypes';
import NumberTemplates from './settings/NumberTemplates';
import RiskRulePolicy from './settings/RiskRulePolicy';
import ComplianceSettings from './settings/ComplianceSettings';
import ComplianceTemplates from './settings/ComplianceTemplates';
import LedgerAdministration from './settings/LedgerAdministration';
import C3LedgerSync from './settings/C3LedgerSync';
import PaymentLedgerSync from './settings/PaymentLedgerSync';
import AssignmentRoutingRules from './settings/AssignmentRoutingRules';
import LedgerPostingAdmin from './settings/LedgerPostingAdmin';
import LedgerOperationsDashboard from './settings/LedgerOperationsDashboard';
import LedgerHelpCenter from './settings/LedgerHelpCenter';
import AuditCommunicationTemplatesPage from './admin/AuditCommunicationTemplatesPage';
import AuditCommunicationTemplateEditorPage from './admin/AuditCommunicationTemplateEditorPage';
import OnlineResponseConfigPage from './admin/OnlineResponseConfigPage';
import RiskOperations from './admin/RiskOperations';
import SetupWizard from './admin/SetupWizard';
import CaseFamiliesPage from './admin/CaseFamiliesPage';
import WorkflowMappingPage from './admin/WorkflowMappingPage';
import WaiverRulesPage from './admin/WaiverRulesPage';
import WaiverRequestsQueue from './waivers/WaiverRequestsQueue';
// Reuses the audit module's Document & Output Settings page (Foundation, Section
// Library, Report Templates) under Compliance Admin routes so officers don't
// have to leave the Compliance module to manage report-level templates.
import DocumentTemplateSettings from '@/pages/audit/DocumentTemplateSettings';

// Tools
import RuleSimulator from './tools/RuleSimulator';
import RiskSimulator from './tools/RiskSimulator';

// Operations
import AssignmentQueues from './operations/AssignmentQueues';
import ReviewQueue from './operations/ReviewQueue';
import Reassignment from './operations/Reassignment';

// Geography
import ZoneManagement from './geography/ZoneManagement';
import OfficeZoneMapping from './geography/OfficeZoneMapping';
import VillageZoneMapping from './geography/VillageZoneMapping';

// Staff
import OfficerManagement from './staff/OfficerManagement';
import QueueMembers from './staff/QueueMembers';
import SupervisorHierarchy from './staff/SupervisorHierarchy';
import LegacyInspectorLinking from './staff/LegacyInspectorLinking';

// Generic placeholder for menu entries whose target screen is not yet built.
import PlaceholderPage from './PlaceholderPage';
import { ComplianceRouteGate } from './ComplianceRouteGate';

const ComplianceRoutes = () => {
  return (
    <Routes>
      {/* ═══════════════════════════════════════════════════════
          MENU-ALIGNMENT PLACEHOLDERS
          Routes reserved by the finalized Compliance & Enforcement
          menu structure but whose target screens are pending
          implementation. Each renders a clear "implementation pending"
          message — no mock business data.
          ═══════════════════════════════════════════════════════ */}
      <Route path="/my-work-queue" element={<ComplianceRouteGate><PlaceholderPage title="My Work Queue" area="Top-level" /></ComplianceRouteGate>} />

      {/* Violations */}
      <Route path="/violations/verification-queue" element={<ComplianceRouteGate><VerificationQueue /></ComplianceRouteGate>} />
      <Route path="/violations/rule-detected" element={<ComplianceRouteGate><RuleDetectedViolations /></ComplianceRouteGate>} />
      <Route path="/violations/duplicate-review" element={<ComplianceRouteGate><DuplicateReview /></ComplianceRouteGate>} />
      <Route path="/violations/history" element={<ComplianceRouteGate><ViolationHistory /></ComplianceRouteGate>} />


      {/* Cases */}
      <Route path="/cases/intake" element={<ComplianceRouteGate><CaseIntake /></ComplianceRouteGate>} />
      <Route path="/cases/assigned" element={<ComplianceRouteGate><AssignedCases /></ComplianceRouteGate>} />
      <Route path="/cases/merge-review" element={<ComplianceRouteGate><CaseMergeReviewPage /></ComplianceRouteGate>} />
      <Route path="/cases/reopen-requests" element={<ComplianceRouteGate><ReopenRequestsPage /></ComplianceRouteGate>} />
      <Route path="/cases/closure" element={<ComplianceRouteGate><CaseClosurePage /></ComplianceRouteGate>} />

      {/* Notices & Communications */}
      <Route path="/notices/register" element={<ComplianceRouteGate><NoticeRegister /></ComplianceRouteGate>} />
      <Route path="/notices/generate" element={<ComplianceRouteGate><GenerateNoticePage /></ComplianceRouteGate>} />
      <Route path="/notices/pending-approval" element={<ComplianceRouteGate><PendingApprovalPage /></ComplianceRouteGate>} />
      <Route path="/notices/delivery-tracking" element={<ComplianceRouteGate><DeliveryTrackingPage /></ComplianceRouteGate>} />
      <Route path="/notices/employer-responses" element={<ComplianceRouteGate><EmployerResponsesPage /></ComplianceRouteGate>} />
      <Route path="/notices/communication-history" element={<ComplianceRouteGate><CommunicationHistoryPage /></ComplianceRouteGate>} />

      {/* Payment Arrangements */}
      <Route path="/arrangements/all" element={<ComplianceRouteGate><AllArrangementsPage /></ComplianceRouteGate>} />
      <Route path="/arrangements/new" element={<ComplianceRouteGate><NewArrangementPage /></ComplianceRouteGate>} />
      <Route path="/arrangements/pending-approval" element={<ComplianceRouteGate><ArrangementPendingApprovalPage /></ComplianceRouteGate>} />
      <Route path="/arrangements/active" element={<ComplianceRouteGate><ActiveArrangementsPage /></ComplianceRouteGate>} />
      <Route path="/arrangements/installments-due" element={<ComplianceRouteGate><InstallmentsDuePage /></ComplianceRouteGate>} />
      <Route path="/arrangements/breaches" element={<ComplianceRouteGate><BreachesPage /></ComplianceRouteGate>} />
      <Route path="/arrangements/payment-allocation" element={<ComplianceRouteGate><PaymentAllocationPage /></ComplianceRouteGate>} />

      {/* Inspections */}
      <Route path="/inspections/evidence" element={<ComplianceRouteGate><InspectionEvidencePage /></ComplianceRouteGate>} />
      <Route path="/inspections/convert-finding" element={<ComplianceRouteGate><ConvertFindingToViolationPage /></ComplianceRouteGate>} />

      {/* Legal Escalations */}
      <Route path="/legal/pack-preparation" element={<ComplianceRouteGate><LegalPackPreparationPage /></ComplianceRouteGate>} />
      <Route path="/legal/approved-escalations" element={<ComplianceRouteGate><ApprovedEscalationsPage /></ComplianceRouteGate>} />
      <Route path="/legal/returned-from-legal" element={<ComplianceRouteGate><ReturnedFromLegalPage /></ComplianceRouteGate>} />

      {/* Risk & Employer Profile */}
      <Route path="/risk/score-details" element={<ComplianceRouteGate><RiskScoreDetailsPage /></ComplianceRouteGate>} />
      <Route path="/risk/repeat-defaulters" element={<ComplianceRouteGate><RepeatDefaultersPage /></ComplianceRouteGate>} />
      <Route path="/risk/high-risk" element={<ComplianceRouteGate><HighRiskEmployersPage /></ComplianceRouteGate>} />
      <Route path="/risk/watchlist" element={<ComplianceRouteGate><WatchlistPage /></ComplianceRouteGate>} />

      {/* Reports */}
      <Route path="/reports/automation-jobs" element={<ComplianceRouteGate><AutomationJobReports /></ComplianceRouteGate>} />

      {/* Administration */}
      <Route path="/admin/setup-wizard" element={<ComplianceRouteGate><SetupWizard /></ComplianceRouteGate>} />
      <Route path="/admin/feature-toggles" element={<ComplianceRouteGate><PlaceholderPage title="Feature Toggles" area="Administration" /></ComplianceRouteGate>} />
      <Route path="/admin/calculation-rules" element={<Navigate to="/compliance/admin/settings/rule-engine" replace />} />
      <Route path="/admin/escalation-rules" element={<Navigate to="/compliance/admin/settings/rule-engine" replace />} />
      <Route path="/admin/case-families" element={<ComplianceRouteGate><CaseFamiliesPage /></ComplianceRouteGate>} />
      <Route path="/admin/workflow-mapping" element={<ComplianceRouteGate><WorkflowMappingPage /></ComplianceRouteGate>} />
      <Route path="/admin/schedule-settings" element={<ComplianceRouteGate><PlaceholderPage title="Schedule Settings" area="Administration" /></ComplianceRouteGate>} />
      <Route path="/admin/payment-arrangement-rules" element={<ComplianceRouteGate><PlaceholderPage title="Payment Arrangement Rules" area="Administration" /></ComplianceRouteGate>} />
      <Route path="/admin/waiver-rules" element={<ComplianceRouteGate><WaiverRulesPage /></ComplianceRouteGate>} />
      <Route path="/waivers/requests" element={<ComplianceRouteGate><WaiverRequestsQueue /></ComplianceRouteGate>} />
      <Route path="/admin/legal-handoff-rules" element={<ComplianceRouteGate><LegalHandoffRulesPage /></ComplianceRouteGate>} />
      <Route path="/admin/help" element={<ComplianceRouteGate><ComplianceHelpAdmin /></ComplianceRouteGate>} />

      {/* ═══════════════════════════════════════════════════════
          1. WORKBENCH — dashboards, monitoring, queues
          ═══════════════════════════════════════════════════════ */}
      <Route path="/workbench/overview" element={<ComplianceRouteGate><ComplianceCommandCenter /></ComplianceRouteGate>} />
      <Route path="/workbench/manager" element={<ComplianceRouteGate><ManagerDashboard /></ComplianceRouteGate>} />
      <Route path="/workbench/inspector" element={<ComplianceRouteGate><InspectorDashboard /></ComplianceRouteGate>} />
      <Route path="/workbench/legal" element={<ComplianceRouteGate><LegalDashboard /></ComplianceRouteGate>} />
      <Route path="/workbench/analytics" element={<ComplianceRouteGate><ComplianceAnalytics /></ComplianceRouteGate>} />
      <Route path="/workbench/monitoring" element={<ComplianceRouteGate><ComplianceMonitoring /></ComplianceRouteGate>} />
      <Route path="/workbench/queues" element={<ComplianceRouteGate><AssignmentQueues /></ComplianceRouteGate>} />
      <Route path="/workbench/review-queue" element={<ComplianceRouteGate><ReviewQueue /></ComplianceRouteGate>} />
      <Route path="/workbench/reassignment" element={<ComplianceRouteGate><Reassignment /></ComplianceRouteGate>} />

      {/* ═══════════════════════════════════════════════════════
          2. VIOLATIONS
          ═══════════════════════════════════════════════════════ */}
      <Route path="/violations" element={<ComplianceRouteGate><ViolationsManagement /></ComplianceRouteGate>} />
      <Route path="/violations/manual-entry" element={<ComplianceRouteGate><ManualViolationEntry /></ComplianceRouteGate>} />
      <Route path="/violations/:id" element={<ComplianceRouteGate><ViolationDetails /></ComplianceRouteGate>} />

      {/* ═══════════════════════════════════════════════════════
          3. CASES
          ═══════════════════════════════════════════════════════ */}
      <Route path="/cases" element={<ComplianceRouteGate><CaseManagement /></ComplianceRouteGate>} />
      <Route path="/cases/queue" element={<ComplianceRouteGate><CaseQueue /></ComplianceRouteGate>} />
      <Route path="/cases/penalties" element={<ComplianceRouteGate><PenaltyManagement /></ComplianceRouteGate>} />

      {/* ═══════════════════════════════════════════════════════
          4. FIELD — planning, execution, inspections, employers
          ═══════════════════════════════════════════════════════ */}
      <Route path="/field/plan-builder" element={<ComplianceRouteGate><WeeklyPlanBuilder /></ComplianceRouteGate>} />
      <Route path="/field/my-plans" element={<ComplianceRouteGate><MyPlans /></ComplianceRouteGate>} />
      <Route path="/field/pending-review" element={<ComplianceRouteGate><PendingReview /></ComplianceRouteGate>} />
      <Route path="/field/pending-review/:planId" element={<ComplianceRouteGate><WeeklyPlanReview /></ComplianceRouteGate>} />
      <Route path="/field/execution" element={<ComplianceRouteGate><FieldExecution /></ComplianceRouteGate>} />
      <Route path="/field/operations" element={<ComplianceRouteGate><FieldOperations /></ComplianceRouteGate>} />
      <Route path="/field/inspections" element={<ComplianceRouteGate><InspectionManagement /></ComplianceRouteGate>} />
      <Route path="/field/findings" element={<ComplianceRouteGate><EmployerFindings /></ComplianceRouteGate>} />
      <Route path="/field/employer-statements" element={<ComplianceRouteGate><EmployerStatements /></ComplianceRouteGate>} />
      <Route path="/field/employer-statement/:employerId" element={<ComplianceRouteGate><EmployerStatementDetail /></ComplianceRouteGate>} />
      {/* Removed: /field/employer-statement/:employerId/financial (EmployerFinancialStatement) */}
      <Route path="/field/visit/:employerId" element={<ComplianceRouteGate><EmployerVisitWorkspace /></ComplianceRouteGate>} />
      <Route path="/field/employer-360" element={<ComplianceRouteGate><Employer360Search /></ComplianceRouteGate>} />
      <Route path="/field/employer-360/:employerId" element={<ComplianceRouteGate><Employer360 /></ComplianceRouteGate>} />
      <Route path="/field/employer-risk/:employerId" element={<ComplianceRouteGate><EmployerRiskProfile /></ComplianceRouteGate>} />
      <Route path="/admin/risk-operations" element={<ComplianceRouteGate><RiskOperations /></ComplianceRouteGate>} />
      {/* Removed: /field/employer-hierarchy (EmployerHierarchy), /field/employer-management (EmployerComplianceManagement) */}
      <Route path="/field/audit-management" element={<ComplianceRouteGate><AuditManagement /></ComplianceRouteGate>} />
      <Route path="/field/audit/:id" element={<ComplianceRouteGate><AuditDetails /></ComplianceRouteGate>} />
      <Route path="/field/weekly-report" element={<ComplianceRouteGate><WeeklyReportSubmission /></ComplianceRouteGate>} />
      <Route path="/field/weekly-reports" element={<ComplianceRouteGate><WeeklyReports /></ComplianceRouteGate>} />
      <Route path="/field/all-reports" element={<ComplianceRouteGate><AllWeeklyReports /></ComplianceRouteGate>} />
      <Route path="/field/execution-dashboard/:planId" element={<ComplianceRouteGate><PlanExecutionDashboard /></ComplianceRouteGate>} />
      <Route path="/field/audit-report/:inspectionId" element={<ComplianceRouteGate><EmployerAuditReportViewer /></ComplianceRouteGate>} />
      <Route path="/field/weekly-report-review" element={<ComplianceRouteGate><WeeklyReportReview /></ComplianceRouteGate>} />
      <Route path="/field/my-upcoming" element={<ComplianceRouteGate><MyUpcomingAudits /></ComplianceRouteGate>} />
      <Route path="/field/sampling" element={<ComplianceRouteGate><SamplingDashboard /></ComplianceRouteGate>} />
      <Route path="/field/sampling/candidates" element={<ComplianceRouteGate><MonthlyAuditCandidates /></ComplianceRouteGate>} />

      {/* ═══════════════════════════════════════════════════════
          5. ENFORCEMENT — legal, notices, arrangements, waivers
          ═══════════════════════════════════════════════════════ */}
      <Route path="/enforcement/recommendation-queue" element={<ComplianceRouteGate><LegalRecommendationQueue /></ComplianceRouteGate>} />
      <Route path="/enforcement/legal-queue" element={<ComplianceRouteGate><LegalQueue /></ComplianceRouteGate>} />
      <Route path="/enforcement/proceedings" element={<ComplianceRouteGate><LegalProceedingsPage /></ComplianceRouteGate>} />
      <Route path="/enforcement/notices" element={<ComplianceRouteGate><NoticesManagement /></ComplianceRouteGate>} />
      <Route path="/enforcement/arrangements" element={<ComplianceRouteGate><PaymentArrangements /></ComplianceRouteGate>} />
      <Route path="/enforcement/breaches" element={<ComplianceRouteGate><BreachMonitoring /></ComplianceRouteGate>} />
      <Route path="/enforcement/waivers" element={<ComplianceRouteGate><WaiversOverrides /></ComplianceRouteGate>} />
      <Route path="/enforcement/legal-referral/new" element={<ComplianceRouteGate><LegalReferralWizard /></ComplianceRouteGate>} />

      {/* ═══════════════════════════════════════════════════════
          6. REPORTS (paths unchanged)
          ═══════════════════════════════════════════════════════ */}
      <Route path="/reports/violations-analytics" element={<ComplianceRouteGate><CaseAnalytics /></ComplianceRouteGate>} />
      <Route path="/reports/inspector-performance" element={<ComplianceRouteGate><InspectorPerformance /></ComplianceRouteGate>} />
      <Route path="/reports/c3-compliance" element={<ComplianceRouteGate><C3Compliance /></ComplianceRouteGate>} />
      <Route path="/reports/arrears" element={<ComplianceRouteGate><ArrearsReports /></ComplianceRouteGate>} />
      <Route path="/reports/audit" element={<ComplianceRouteGate><AuditReports /></ComplianceRouteGate>} />
      <Route path="/reports/arrangements" element={<ComplianceRouteGate><ArrangementReports /></ComplianceRouteGate>} />
      <Route path="/reports/legal" element={<ComplianceRouteGate><LegalEscalationReports /></ComplianceRouteGate>} />
      <Route path="/reports/trends" element={<ComplianceRouteGate><TrendReports /></ComplianceRouteGate>} />

      {/* ═══════════════════════════════════════════════════════
          7. ADMIN — settings, geography, staff, automation, tools
          ═══════════════════════════════════════════════════════ */}
      <Route path="/admin/settings" element={<ComplianceRouteGate><ComplianceSettings /></ComplianceRouteGate>} />
      <Route path="/admin/settings/rule-engine" element={<ComplianceRouteGate><RuleEngine /></ComplianceRouteGate>} />
      <Route path="/admin/settings/violation-types" element={<ComplianceRouteGate><ViolationTypes /></ComplianceRouteGate>} />
      <Route path="/admin/settings/assignment-routing" element={<ComplianceRouteGate><AssignmentRoutingRules /></ComplianceRouteGate>} />
      <Route path="/admin/settings/number-templates" element={<ComplianceRouteGate><NumberTemplates /></ComplianceRouteGate>} />
      <Route path="/admin/settings/risk-policy" element={<ComplianceRouteGate><RiskRulePolicy /></ComplianceRouteGate>} />
      <Route path="/admin/settings/templates" element={<ComplianceRouteGate><ComplianceTemplates /></ComplianceRouteGate>} />
      <Route path="/admin/communication-templates" element={<ComplianceRouteGate><AuditCommunicationTemplatesPage /></ComplianceRouteGate>} />
      <Route path="/admin/communication-templates/new" element={<ComplianceRouteGate><AuditCommunicationTemplateEditorPage /></ComplianceRouteGate>} />
      <Route path="/admin/communication-templates/:id" element={<ComplianceRouteGate><AuditCommunicationTemplateEditorPage /></ComplianceRouteGate>} />
      {/* Templates & Output — Report Templates (output documents) */}
      <Route
        path="/admin/report-templates"
        element={
          <DocumentTemplateSettings
            defaultTab="audit_report"
            title="Report Templates"
            description="Document/output structure templates: Internal Working Paper, Employer Audit Report, Findings Memo, Evidence Summary, Violation Document, Legal/Enforcement Pack, Management Summary."
          />
        }
      />
      {/* Templates & Output — Shared Sections & Foundation */}
      <Route
        path="/admin/document-foundation"
        element={
          <DocumentTemplateSettings
            defaultTab="foundation"
            title="Shared Sections & Foundation"
            description="Section library, reusable clauses/disclaimers, document branding, merge fields, and output defaults shared by all report templates."
          />
        }
      />
      <Route path="/admin/online-response" element={<ComplianceRouteGate><OnlineResponseConfigPage /></ComplianceRouteGate>} />
      <Route path="/admin/settings/sampling" element={<ComplianceRouteGate><RiskSamplingSettings /></ComplianceRouteGate>} />
      <Route path="/admin/settings/c3-ledger-sync" element={<ComplianceRouteGate><C3LedgerSync /></ComplianceRouteGate>} />
      <Route path="/admin/settings/payment-ledger-sync" element={<ComplianceRouteGate><PaymentLedgerSync /></ComplianceRouteGate>} />
      <Route path="/admin/settings/ledger-admin" element={<ComplianceRouteGate><LedgerAdministration /></ComplianceRouteGate>} />
      <Route path="/admin/settings/ledger-posting" element={<ComplianceRouteGate><LedgerPostingAdmin /></ComplianceRouteGate>} />
      <Route path="/admin/settings/ledger-operations" element={<ComplianceRouteGate><LedgerOperationsDashboard /></ComplianceRouteGate>} />
      <Route path="/admin/settings/ledger-help" element={<ComplianceRouteGate><LedgerHelpCenter /></ComplianceRouteGate>} />
      <Route path="/admin/geography/zones" element={<ComplianceRouteGate><ZoneManagement /></ComplianceRouteGate>} />
      <Route path="/admin/geography/office-zone-mapping" element={<ComplianceRouteGate><OfficeZoneMapping /></ComplianceRouteGate>} />
      <Route path="/admin/geography/village-zone-mapping" element={<ComplianceRouteGate><VillageZoneMapping /></ComplianceRouteGate>} />
      <Route path="/admin/staff/officers" element={<ComplianceRouteGate><OfficerManagement /></ComplianceRouteGate>} />
      <Route path="/admin/staff/queue-members" element={<ComplianceRouteGate><QueueMembers /></ComplianceRouteGate>} />
      <Route path="/admin/staff/supervisors" element={<ComplianceRouteGate><SupervisorHierarchy /></ComplianceRouteGate>} />
      <Route path="/admin/staff/link-legacy" element={<ComplianceRouteGate><LegacyInspectorLinking /></ComplianceRouteGate>} />
      <Route path="/admin/automation/jobs" element={<ComplianceRouteGate><JobConfiguration /></ComplianceRouteGate>} />
      <Route path="/admin/automation/history" element={<ComplianceRouteGate><JobHistory /></ComplianceRouteGate>} />
      <Route path="/admin/automation/employer-jobs" element={<ComplianceRouteGate><EmployerComplianceJobs /></ComplianceRouteGate>} />
      <Route path="/admin/tools/rule-simulator" element={<ComplianceRouteGate><RuleSimulator /></ComplianceRouteGate>} />
      <Route path="/admin/tools/risk-simulator" element={<ComplianceRouteGate><RiskSimulator /></ComplianceRouteGate>} />

      {/* ═══════════════════════════════════════════════════════
          LEGACY REDIRECTS — old paths → new canonical paths
          ═══════════════════════════════════════════════════════ */}

      {/* Workbench legacy */}
      <Route path="/dashboard" element={<ComplianceRouteGate><Navigate to="/compliance/workbench/manager" replace /></ComplianceRouteGate>} />
      <Route path="/dashboard/manager" element={<ComplianceRouteGate><Navigate to="/compliance/workbench/manager" replace /></ComplianceRouteGate>} />
      <Route path="/dashboard/inspector" element={<ComplianceRouteGate><Navigate to="/compliance/workbench/inspector" replace /></ComplianceRouteGate>} />
      <Route path="/dashboard/legal" element={<ComplianceRouteGate><Navigate to="/compliance/workbench/legal" replace /></ComplianceRouteGate>} />
      <Route path="/dashboard/analytics" element={<ComplianceRouteGate><Navigate to="/compliance/workbench/analytics" replace /></ComplianceRouteGate>} />
      <Route path="/monitoring" element={<ComplianceRouteGate><Navigate to="/compliance/workbench/monitoring" replace /></ComplianceRouteGate>} />
      <Route path="/operations/queues" element={<ComplianceRouteGate><Navigate to="/compliance/workbench/queues" replace /></ComplianceRouteGate>} />
      <Route path="/operations/review-queue" element={<ComplianceRouteGate><Navigate to="/compliance/workbench/review-queue" replace /></ComplianceRouteGate>} />
      <Route path="/operations/reassignment" element={<ComplianceRouteGate><Navigate to="/compliance/workbench/reassignment" replace /></ComplianceRouteGate>} />

      {/* Field legacy */}
      <Route path="/audit-planning/weekly-plan-builder" element={<ComplianceRouteGate><Navigate to="/compliance/field/plan-builder" replace /></ComplianceRouteGate>} />
      <Route path="/audit-planning/my-plans" element={<ComplianceRouteGate><Navigate to="/compliance/field/my-plans" replace /></ComplianceRouteGate>} />
      <Route path="/inspector-plans" element={<ComplianceRouteGate><Navigate to="/compliance/field/my-plans" replace /></ComplianceRouteGate>} />
      <Route path="/audit-planning/pending-review" element={<ComplianceRouteGate><Navigate to="/compliance/field/pending-review" replace /></ComplianceRouteGate>} />
      <Route path="/audit-planning/field-execution" element={<ComplianceRouteGate><Navigate to="/compliance/field/execution" replace /></ComplianceRouteGate>} />
      <Route path="/inspections" element={<ComplianceRouteGate><Navigate to="/compliance/field/inspections" replace /></ComplianceRouteGate>} />
      <Route path="/inspections/field-execution" element={<ComplianceRouteGate><Navigate to="/compliance/field/execution" replace /></ComplianceRouteGate>} />
      <Route path="/inspections/field-operations" element={<ComplianceRouteGate><Navigate to="/compliance/field/operations" replace /></ComplianceRouteGate>} />
      <Route path="/employers/findings" element={<ComplianceRouteGate><Navigate to="/compliance/field/findings" replace /></ComplianceRouteGate>} />
      <Route path="/employer-statements" element={<ComplianceRouteGate><Navigate to="/compliance/field/employer-statements" replace /></ComplianceRouteGate>} />
      {/* Legacy redirects for removed screens — redirect to employer-statements as fallback */}
      <Route path="/employers/visit/:id" element={<ComplianceRouteGate><Navigate to="/compliance/field/employer-statements" replace /></ComplianceRouteGate>} />
      <Route path="/employers/management" element={<ComplianceRouteGate><Navigate to="/compliance/field/employer-statements" replace /></ComplianceRouteGate>} />
      <Route path="/employers/hierarchy" element={<ComplianceRouteGate><Navigate to="/compliance/field/employer-statements" replace /></ComplianceRouteGate>} />
      <Route path="/employer" element={<ComplianceRouteGate><Navigate to="/compliance/field/employer-statements" replace /></ComplianceRouteGate>} />
      <Route path="/audits/management" element={<ComplianceRouteGate><Navigate to="/compliance/field/audit-management" replace /></ComplianceRouteGate>} />
      <Route path="/violations/weekly-reports" element={<ComplianceRouteGate><Navigate to="/compliance/field/weekly-report" replace /></ComplianceRouteGate>} />
      <Route path="/audit-planning/weekly-reports" element={<ComplianceRouteGate><Navigate to="/compliance/field/weekly-reports" replace /></ComplianceRouteGate>} />
      <Route path="/audit-planning/all-reports" element={<ComplianceRouteGate><Navigate to="/compliance/field/all-reports" replace /></ComplianceRouteGate>} />
      <Route path="/my-audits/upcoming" element={<ComplianceRouteGate><Navigate to="/compliance/field/my-upcoming" replace /></ComplianceRouteGate>} />
      <Route path="/audit-planning/sampling-dashboard" element={<ComplianceRouteGate><Navigate to="/compliance/field/sampling" replace /></ComplianceRouteGate>} />
      <Route path="/sampling" element={<ComplianceRouteGate><Navigate to="/compliance/field/sampling" replace /></ComplianceRouteGate>} />
      <Route path="/audit-planning/monthly-candidates" element={<ComplianceRouteGate><Navigate to="/compliance/field/sampling/candidates" replace /></ComplianceRouteGate>} />
      <Route path="/sampling/candidates" element={<ComplianceRouteGate><Navigate to="/compliance/field/sampling/candidates" replace /></ComplianceRouteGate>} />
      <Route path="/sampling/upcoming" element={<ComplianceRouteGate><Navigate to="/compliance/field/my-upcoming" replace /></ComplianceRouteGate>} />

      {/* Enforcement legacy */}
      <Route path="/legal-recommendation-queue" element={<ComplianceRouteGate><Navigate to="/compliance/enforcement/recommendation-queue" replace /></ComplianceRouteGate>} />
      <Route path="/legal/queue" element={<ComplianceRouteGate><Navigate to="/compliance/enforcement/legal-queue" replace /></ComplianceRouteGate>} />
      <Route path="/legal/proceedings" element={<ComplianceRouteGate><Navigate to="/compliance/enforcement/proceedings" replace /></ComplianceRouteGate>} />
      <Route path="/notices" element={<ComplianceRouteGate><Navigate to="/compliance/enforcement/notices" replace /></ComplianceRouteGate>} />
      <Route path="/arrangements" element={<ComplianceRouteGate><Navigate to="/compliance/enforcement/arrangements" replace /></ComplianceRouteGate>} />
      <Route path="/payment-arrangements" element={<ComplianceRouteGate><Navigate to="/compliance/enforcement/arrangements" replace /></ComplianceRouteGate>} />
      <Route path="/arrangements/breaches" element={<ComplianceRouteGate><Navigate to="/compliance/enforcement/breaches" replace /></ComplianceRouteGate>} />
      <Route path="/waivers" element={<ComplianceRouteGate><Navigate to="/compliance/enforcement/waivers" replace /></ComplianceRouteGate>} />
      <Route path="/penalties" element={<ComplianceRouteGate><Navigate to="/compliance/cases/penalties" replace /></ComplianceRouteGate>} />
      <Route path="/legal-referral/new" element={<ComplianceRouteGate><Navigate to="/compliance/enforcement/legal-referral/new" replace /></ComplianceRouteGate>} />

      {/* Admin legacy */}
      <Route path="/settings" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings" replace /></ComplianceRouteGate>} />
      <Route path="/settings/rule-engine" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/rule-engine" replace /></ComplianceRouteGate>} />
      <Route path="/settings/violation-types" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/violation-types" replace /></ComplianceRouteGate>} />
      <Route path="/settings/assignment-routing" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/assignment-routing" replace /></ComplianceRouteGate>} />
      <Route path="/settings/number-templates" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/number-templates" replace /></ComplianceRouteGate>} />
      <Route path="/settings/risk-policy" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/risk-policy" replace /></ComplianceRouteGate>} />
      <Route path="/settings/risk-config" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/risk-policy" replace /></ComplianceRouteGate>} />
      <Route path="/settings/legal-escalation-policy" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/risk-policy" replace /></ComplianceRouteGate>} />
      <Route path="/settings/templates" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/templates" replace /></ComplianceRouteGate>} />
      <Route path="/settings/c3-ledger-sync" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/c3-ledger-sync" replace /></ComplianceRouteGate>} />
      <Route path="/settings/payment-ledger-sync" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/payment-ledger-sync" replace /></ComplianceRouteGate>} />
      <Route path="/settings/ledger-admin" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/ledger-admin" replace /></ComplianceRouteGate>} />
      <Route path="/audit-planning/settings" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/sampling" replace /></ComplianceRouteGate>} />
      <Route path="/sampling/settings" element={<ComplianceRouteGate><Navigate to="/compliance/admin/settings/sampling" replace /></ComplianceRouteGate>} />
      <Route path="/geography/zones" element={<ComplianceRouteGate><Navigate to="/compliance/admin/geography/zones" replace /></ComplianceRouteGate>} />
      <Route path="/geography/office-zone-mapping" element={<ComplianceRouteGate><Navigate to="/compliance/admin/geography/office-zone-mapping" replace /></ComplianceRouteGate>} />
      <Route path="/geography/village-zone-mapping" element={<ComplianceRouteGate><Navigate to="/compliance/admin/geography/village-zone-mapping" replace /></ComplianceRouteGate>} />
      <Route path="/staff/officers" element={<ComplianceRouteGate><Navigate to="/compliance/admin/staff/officers" replace /></ComplianceRouteGate>} />
      <Route path="/staff/queue-members" element={<ComplianceRouteGate><Navigate to="/compliance/admin/staff/queue-members" replace /></ComplianceRouteGate>} />
      <Route path="/staff/supervisors" element={<ComplianceRouteGate><Navigate to="/compliance/admin/staff/supervisors" replace /></ComplianceRouteGate>} />
      <Route path="/staff/link-legacy" element={<ComplianceRouteGate><Navigate to="/compliance/admin/staff/link-legacy" replace /></ComplianceRouteGate>} />
      <Route path="/automation/jobs" element={<ComplianceRouteGate><Navigate to="/compliance/admin/automation/jobs" replace /></ComplianceRouteGate>} />
      <Route path="/automation/history" element={<ComplianceRouteGate><Navigate to="/compliance/admin/automation/history" replace /></ComplianceRouteGate>} />
      <Route path="/automation/employer-jobs" element={<ComplianceRouteGate><Navigate to="/compliance/admin/automation/employer-jobs" replace /></ComplianceRouteGate>} />
      <Route path="/tools/rule-simulator" element={<ComplianceRouteGate><Navigate to="/compliance/admin/tools/rule-simulator" replace /></ComplianceRouteGate>} />
      <Route path="/tools/risk-simulator" element={<ComplianceRouteGate><Navigate to="/compliance/admin/tools/risk-simulator" replace /></ComplianceRouteGate>} />

      {/* Reports legacy (case-analytics alias) */}
      <Route path="/reports/case-analytics" element={<ComplianceRouteGate><Navigate to="/compliance/reports/violations-analytics" replace /></ComplianceRouteGate>} />
    </Routes>
  );
};

export default ComplianceRoutes;
