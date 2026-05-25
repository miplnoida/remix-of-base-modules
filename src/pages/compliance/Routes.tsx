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
      <Route path="/my-work-queue" element={<PlaceholderPage title="My Work Queue" area="Top-level" />} />

      {/* Violations */}
      <Route path="/violations/verification-queue" element={<VerificationQueue />} />
      <Route path="/violations/rule-detected" element={<RuleDetectedViolations />} />
      <Route path="/violations/duplicate-review" element={<DuplicateReview />} />
      <Route path="/violations/history" element={<ViolationHistory />} />


      {/* Cases */}
      <Route path="/cases/intake" element={<CaseIntake />} />
      <Route path="/cases/assigned" element={<AssignedCases />} />
      <Route path="/cases/merge-review" element={<CaseMergeReviewPage />} />
      <Route path="/cases/reopen-requests" element={<ReopenRequestsPage />} />
      <Route path="/cases/closure" element={<CaseClosurePage />} />

      {/* Notices & Communications */}
      <Route path="/notices/register" element={<NoticeRegister />} />
      <Route path="/notices/generate" element={<GenerateNoticePage />} />
      <Route path="/notices/pending-approval" element={<PendingApprovalPage />} />
      <Route path="/notices/delivery-tracking" element={<DeliveryTrackingPage />} />
      <Route path="/notices/employer-responses" element={<EmployerResponsesPage />} />
      <Route path="/notices/communication-history" element={<CommunicationHistoryPage />} />

      {/* Payment Arrangements */}
      <Route path="/arrangements/all" element={<AllArrangementsPage />} />
      <Route path="/arrangements/new" element={<NewArrangementPage />} />
      <Route path="/arrangements/pending-approval" element={<ArrangementPendingApprovalPage />} />
      <Route path="/arrangements/active" element={<ActiveArrangementsPage />} />
      <Route path="/arrangements/installments-due" element={<InstallmentsDuePage />} />
      <Route path="/arrangements/breaches" element={<BreachesPage />} />
      <Route path="/arrangements/payment-allocation" element={<PaymentAllocationPage />} />

      {/* Inspections */}
      <Route path="/inspections/evidence" element={<InspectionEvidencePage />} />
      <Route path="/inspections/convert-finding" element={<ConvertFindingToViolationPage />} />

      {/* Legal Escalations */}
      <Route path="/legal/pack-preparation" element={<LegalPackPreparationPage />} />
      <Route path="/legal/approved-escalations" element={<ApprovedEscalationsPage />} />
      <Route path="/legal/returned-from-legal" element={<ReturnedFromLegalPage />} />

      {/* Risk & Employer Profile */}
      <Route path="/risk/score-details" element={<RiskScoreDetailsPage />} />
      <Route path="/risk/repeat-defaulters" element={<RepeatDefaultersPage />} />
      <Route path="/risk/high-risk" element={<HighRiskEmployersPage />} />
      <Route path="/risk/watchlist" element={<WatchlistPage />} />

      {/* Reports */}
      <Route path="/reports/automation-jobs" element={<AutomationJobReports />} />

      {/* Administration */}
      <Route path="/admin/setup-wizard" element={<SetupWizard />} />
      <Route path="/admin/feature-toggles" element={<PlaceholderPage title="Feature Toggles" area="Administration" />} />
      <Route path="/admin/calculation-rules" element={<PlaceholderPage title="Calculation Rules" area="Administration" />} />
      <Route path="/admin/escalation-rules" element={<PlaceholderPage title="Escalation Rules" area="Administration" />} />
      <Route path="/admin/case-families" element={<CaseFamiliesPage />} />
      <Route path="/admin/workflow-mapping" element={<WorkflowMappingPage />} />
      <Route path="/admin/schedule-settings" element={<PlaceholderPage title="Schedule Settings" area="Administration" />} />
      <Route path="/admin/payment-arrangement-rules" element={<PlaceholderPage title="Payment Arrangement Rules" area="Administration" />} />
      <Route path="/admin/waiver-rules" element={<WaiverRulesPage />} />
      <Route path="/waivers/requests" element={<WaiverRequestsQueue />} />
      <Route path="/admin/legal-handoff-rules" element={<LegalHandoffRulesPage />} />
      <Route path="/admin/help" element={<ComplianceHelpAdmin />} />

      {/* ═══════════════════════════════════════════════════════
          1. WORKBENCH — dashboards, monitoring, queues
          ═══════════════════════════════════════════════════════ */}
      <Route path="/workbench/overview" element={<ComplianceCommandCenter />} />
      <Route path="/workbench/manager" element={<ManagerDashboard />} />
      <Route path="/workbench/inspector" element={<InspectorDashboard />} />
      <Route path="/workbench/legal" element={<LegalDashboard />} />
      <Route path="/workbench/analytics" element={<ComplianceAnalytics />} />
      <Route path="/workbench/monitoring" element={<ComplianceMonitoring />} />
      <Route path="/workbench/queues" element={<AssignmentQueues />} />
      <Route path="/workbench/review-queue" element={<ReviewQueue />} />
      <Route path="/workbench/reassignment" element={<Reassignment />} />

      {/* ═══════════════════════════════════════════════════════
          2. VIOLATIONS
          ═══════════════════════════════════════════════════════ */}
      <Route path="/violations" element={<ViolationsManagement />} />
      <Route path="/violations/manual-entry" element={<ManualViolationEntry />} />
      <Route path="/violations/:id" element={<ViolationDetails />} />

      {/* ═══════════════════════════════════════════════════════
          3. CASES
          ═══════════════════════════════════════════════════════ */}
      <Route path="/cases" element={<CaseManagement />} />
      <Route path="/cases/queue" element={<CaseQueue />} />
      <Route path="/cases/penalties" element={<PenaltyManagement />} />

      {/* ═══════════════════════════════════════════════════════
          4. FIELD — planning, execution, inspections, employers
          ═══════════════════════════════════════════════════════ */}
      <Route path="/field/plan-builder" element={<WeeklyPlanBuilder />} />
      <Route path="/field/my-plans" element={<MyPlans />} />
      <Route path="/field/pending-review" element={<PendingReview />} />
      <Route path="/field/pending-review/:planId" element={<WeeklyPlanReview />} />
      <Route path="/field/execution" element={<FieldExecution />} />
      <Route path="/field/operations" element={<FieldOperations />} />
      <Route path="/field/inspections" element={<InspectionManagement />} />
      <Route path="/field/findings" element={<EmployerFindings />} />
      <Route path="/field/employer-statements" element={<EmployerStatements />} />
      <Route path="/field/employer-statement/:employerId" element={<EmployerStatementDetail />} />
      {/* Removed: /field/employer-statement/:employerId/financial (EmployerFinancialStatement) */}
      <Route path="/field/visit/:employerId" element={<EmployerVisitWorkspace />} />
      <Route path="/field/employer-360" element={<Employer360Search />} />
      <Route path="/field/employer-360/:employerId" element={<Employer360 />} />
      <Route path="/field/employer-risk/:employerId" element={<EmployerRiskProfile />} />
      <Route path="/admin/risk-operations" element={<RiskOperations />} />
      {/* Removed: /field/employer-hierarchy (EmployerHierarchy), /field/employer-management (EmployerComplianceManagement) */}
      <Route path="/field/audit-management" element={<AuditManagement />} />
      <Route path="/field/audit/:id" element={<AuditDetails />} />
      <Route path="/field/weekly-report" element={<WeeklyReportSubmission />} />
      <Route path="/field/weekly-reports" element={<WeeklyReports />} />
      <Route path="/field/all-reports" element={<AllWeeklyReports />} />
      <Route path="/field/execution-dashboard/:planId" element={<PlanExecutionDashboard />} />
      <Route path="/field/audit-report/:inspectionId" element={<EmployerAuditReportViewer />} />
      <Route path="/field/weekly-report-review" element={<WeeklyReportReview />} />
      <Route path="/field/my-upcoming" element={<MyUpcomingAudits />} />
      <Route path="/field/sampling" element={<SamplingDashboard />} />
      <Route path="/field/sampling/candidates" element={<MonthlyAuditCandidates />} />

      {/* ═══════════════════════════════════════════════════════
          5. ENFORCEMENT — legal, notices, arrangements, waivers
          ═══════════════════════════════════════════════════════ */}
      <Route path="/enforcement/recommendation-queue" element={<LegalRecommendationQueue />} />
      <Route path="/enforcement/legal-queue" element={<LegalQueue />} />
      <Route path="/enforcement/proceedings" element={<LegalProceedingsPage />} />
      <Route path="/enforcement/notices" element={<NoticesManagement />} />
      <Route path="/enforcement/arrangements" element={<PaymentArrangements />} />
      <Route path="/enforcement/breaches" element={<BreachMonitoring />} />
      <Route path="/enforcement/waivers" element={<WaiversOverrides />} />
      <Route path="/enforcement/legal-referral/new" element={<LegalReferralWizard />} />

      {/* ═══════════════════════════════════════════════════════
          6. REPORTS (paths unchanged)
          ═══════════════════════════════════════════════════════ */}
      <Route path="/reports/violations-analytics" element={<CaseAnalytics />} />
      <Route path="/reports/inspector-performance" element={<InspectorPerformance />} />
      <Route path="/reports/c3-compliance" element={<C3Compliance />} />
      <Route path="/reports/arrears" element={<ArrearsReports />} />
      <Route path="/reports/audit" element={<AuditReports />} />
      <Route path="/reports/arrangements" element={<ArrangementReports />} />
      <Route path="/reports/legal" element={<LegalEscalationReports />} />
      <Route path="/reports/trends" element={<TrendReports />} />

      {/* ═══════════════════════════════════════════════════════
          7. ADMIN — settings, geography, staff, automation, tools
          ═══════════════════════════════════════════════════════ */}
      <Route path="/admin/settings" element={<ComplianceSettings />} />
      <Route path="/admin/settings/rule-engine" element={<RuleEngine />} />
      <Route path="/admin/settings/violation-types" element={<ViolationTypes />} />
      <Route path="/admin/settings/assignment-routing" element={<AssignmentRoutingRules />} />
      <Route path="/admin/settings/number-templates" element={<NumberTemplates />} />
      <Route path="/admin/settings/risk-policy" element={<RiskRulePolicy />} />
      <Route path="/admin/settings/templates" element={<ComplianceTemplates />} />
      <Route path="/admin/communication-templates" element={<AuditCommunicationTemplatesPage />} />
      <Route path="/admin/communication-templates/new" element={<AuditCommunicationTemplateEditorPage />} />
      <Route path="/admin/communication-templates/:id" element={<AuditCommunicationTemplateEditorPage />} />
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
      <Route path="/admin/online-response" element={<OnlineResponseConfigPage />} />
      <Route path="/admin/settings/sampling" element={<RiskSamplingSettings />} />
      <Route path="/admin/settings/c3-ledger-sync" element={<C3LedgerSync />} />
      <Route path="/admin/settings/payment-ledger-sync" element={<PaymentLedgerSync />} />
      <Route path="/admin/settings/ledger-admin" element={<LedgerAdministration />} />
      <Route path="/admin/settings/ledger-posting" element={<LedgerPostingAdmin />} />
      <Route path="/admin/settings/ledger-operations" element={<LedgerOperationsDashboard />} />
      <Route path="/admin/settings/ledger-help" element={<LedgerHelpCenter />} />
      <Route path="/admin/geography/zones" element={<ZoneManagement />} />
      <Route path="/admin/geography/office-zone-mapping" element={<OfficeZoneMapping />} />
      <Route path="/admin/geography/village-zone-mapping" element={<VillageZoneMapping />} />
      <Route path="/admin/staff/officers" element={<OfficerManagement />} />
      <Route path="/admin/staff/queue-members" element={<QueueMembers />} />
      <Route path="/admin/staff/supervisors" element={<SupervisorHierarchy />} />
      <Route path="/admin/staff/link-legacy" element={<LegacyInspectorLinking />} />
      <Route path="/admin/automation/jobs" element={<JobConfiguration />} />
      <Route path="/admin/automation/history" element={<JobHistory />} />
      <Route path="/admin/automation/employer-jobs" element={<EmployerComplianceJobs />} />
      <Route path="/admin/tools/rule-simulator" element={<RuleSimulator />} />
      <Route path="/admin/tools/risk-simulator" element={<RiskSimulator />} />

      {/* ═══════════════════════════════════════════════════════
          LEGACY REDIRECTS — old paths → new canonical paths
          ═══════════════════════════════════════════════════════ */}

      {/* Workbench legacy */}
      <Route path="/dashboard" element={<Navigate to="/compliance/workbench/manager" replace />} />
      <Route path="/dashboard/manager" element={<Navigate to="/compliance/workbench/manager" replace />} />
      <Route path="/dashboard/inspector" element={<Navigate to="/compliance/workbench/inspector" replace />} />
      <Route path="/dashboard/legal" element={<Navigate to="/compliance/workbench/legal" replace />} />
      <Route path="/dashboard/analytics" element={<Navigate to="/compliance/workbench/analytics" replace />} />
      <Route path="/monitoring" element={<Navigate to="/compliance/workbench/monitoring" replace />} />
      <Route path="/operations/queues" element={<Navigate to="/compliance/workbench/queues" replace />} />
      <Route path="/operations/review-queue" element={<Navigate to="/compliance/workbench/review-queue" replace />} />
      <Route path="/operations/reassignment" element={<Navigate to="/compliance/workbench/reassignment" replace />} />

      {/* Field legacy */}
      <Route path="/audit-planning/weekly-plan-builder" element={<Navigate to="/compliance/field/plan-builder" replace />} />
      <Route path="/audit-planning/my-plans" element={<Navigate to="/compliance/field/my-plans" replace />} />
      <Route path="/inspector-plans" element={<Navigate to="/compliance/field/my-plans" replace />} />
      <Route path="/audit-planning/pending-review" element={<Navigate to="/compliance/field/pending-review" replace />} />
      <Route path="/audit-planning/field-execution" element={<Navigate to="/compliance/field/execution" replace />} />
      <Route path="/inspections" element={<Navigate to="/compliance/field/inspections" replace />} />
      <Route path="/inspections/field-execution" element={<Navigate to="/compliance/field/execution" replace />} />
      <Route path="/inspections/field-operations" element={<Navigate to="/compliance/field/operations" replace />} />
      <Route path="/employers/findings" element={<Navigate to="/compliance/field/findings" replace />} />
      <Route path="/employer-statements" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      {/* Legacy redirects for removed screens — redirect to employer-statements as fallback */}
      <Route path="/employers/visit/:id" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/employers/management" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/employers/hierarchy" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/employer" element={<Navigate to="/compliance/field/employer-statements" replace />} />
      <Route path="/audits/management" element={<Navigate to="/compliance/field/audit-management" replace />} />
      <Route path="/violations/weekly-reports" element={<Navigate to="/compliance/field/weekly-report" replace />} />
      <Route path="/audit-planning/weekly-reports" element={<Navigate to="/compliance/field/weekly-reports" replace />} />
      <Route path="/audit-planning/all-reports" element={<Navigate to="/compliance/field/all-reports" replace />} />
      <Route path="/my-audits/upcoming" element={<Navigate to="/compliance/field/my-upcoming" replace />} />
      <Route path="/audit-planning/sampling-dashboard" element={<Navigate to="/compliance/field/sampling" replace />} />
      <Route path="/sampling" element={<Navigate to="/compliance/field/sampling" replace />} />
      <Route path="/audit-planning/monthly-candidates" element={<Navigate to="/compliance/field/sampling/candidates" replace />} />
      <Route path="/sampling/candidates" element={<Navigate to="/compliance/field/sampling/candidates" replace />} />
      <Route path="/sampling/upcoming" element={<Navigate to="/compliance/field/my-upcoming" replace />} />

      {/* Enforcement legacy */}
      <Route path="/legal-recommendation-queue" element={<Navigate to="/compliance/enforcement/recommendation-queue" replace />} />
      <Route path="/legal/queue" element={<Navigate to="/compliance/enforcement/legal-queue" replace />} />
      <Route path="/legal/proceedings" element={<Navigate to="/compliance/enforcement/proceedings" replace />} />
      <Route path="/notices" element={<Navigate to="/compliance/enforcement/notices" replace />} />
      <Route path="/arrangements" element={<Navigate to="/compliance/enforcement/arrangements" replace />} />
      <Route path="/payment-arrangements" element={<Navigate to="/compliance/enforcement/arrangements" replace />} />
      <Route path="/arrangements/breaches" element={<Navigate to="/compliance/enforcement/breaches" replace />} />
      <Route path="/waivers" element={<Navigate to="/compliance/enforcement/waivers" replace />} />
      <Route path="/penalties" element={<Navigate to="/compliance/cases/penalties" replace />} />
      <Route path="/legal-referral/new" element={<Navigate to="/compliance/enforcement/legal-referral/new" replace />} />

      {/* Admin legacy */}
      <Route path="/settings" element={<Navigate to="/compliance/admin/settings" replace />} />
      <Route path="/settings/rule-engine" element={<Navigate to="/compliance/admin/settings/rule-engine" replace />} />
      <Route path="/settings/violation-types" element={<Navigate to="/compliance/admin/settings/violation-types" replace />} />
      <Route path="/settings/assignment-routing" element={<Navigate to="/compliance/admin/settings/assignment-routing" replace />} />
      <Route path="/settings/number-templates" element={<Navigate to="/compliance/admin/settings/number-templates" replace />} />
      <Route path="/settings/risk-policy" element={<Navigate to="/compliance/admin/settings/risk-policy" replace />} />
      <Route path="/settings/risk-config" element={<Navigate to="/compliance/admin/settings/risk-policy" replace />} />
      <Route path="/settings/legal-escalation-policy" element={<Navigate to="/compliance/admin/settings/risk-policy" replace />} />
      <Route path="/settings/templates" element={<Navigate to="/compliance/admin/settings/templates" replace />} />
      <Route path="/settings/c3-ledger-sync" element={<Navigate to="/compliance/admin/settings/c3-ledger-sync" replace />} />
      <Route path="/settings/payment-ledger-sync" element={<Navigate to="/compliance/admin/settings/payment-ledger-sync" replace />} />
      <Route path="/settings/ledger-admin" element={<Navigate to="/compliance/admin/settings/ledger-admin" replace />} />
      <Route path="/audit-planning/settings" element={<Navigate to="/compliance/admin/settings/sampling" replace />} />
      <Route path="/sampling/settings" element={<Navigate to="/compliance/admin/settings/sampling" replace />} />
      <Route path="/geography/zones" element={<Navigate to="/compliance/admin/geography/zones" replace />} />
      <Route path="/geography/office-zone-mapping" element={<Navigate to="/compliance/admin/geography/office-zone-mapping" replace />} />
      <Route path="/geography/village-zone-mapping" element={<Navigate to="/compliance/admin/geography/village-zone-mapping" replace />} />
      <Route path="/staff/officers" element={<Navigate to="/compliance/admin/staff/officers" replace />} />
      <Route path="/staff/queue-members" element={<Navigate to="/compliance/admin/staff/queue-members" replace />} />
      <Route path="/staff/supervisors" element={<Navigate to="/compliance/admin/staff/supervisors" replace />} />
      <Route path="/staff/link-legacy" element={<Navigate to="/compliance/admin/staff/link-legacy" replace />} />
      <Route path="/automation/jobs" element={<Navigate to="/compliance/admin/automation/jobs" replace />} />
      <Route path="/automation/history" element={<Navigate to="/compliance/admin/automation/history" replace />} />
      <Route path="/automation/employer-jobs" element={<Navigate to="/compliance/admin/automation/employer-jobs" replace />} />
      <Route path="/tools/rule-simulator" element={<Navigate to="/compliance/admin/tools/rule-simulator" replace />} />
      <Route path="/tools/risk-simulator" element={<Navigate to="/compliance/admin/tools/risk-simulator" replace />} />

      {/* Reports legacy (case-analytics alias) */}
      <Route path="/reports/case-analytics" element={<Navigate to="/compliance/reports/violations-analytics" replace />} />
    </Routes>
  );
};

export default ComplianceRoutes;
