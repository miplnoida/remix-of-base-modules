import { 
  Shield,
  LayoutDashboard,
  Users,
  FileSearch,
  Target,
  Grid3X3,
  FileText,
  Briefcase,
  AlertCircle,
  CheckSquare,
  BarChart3,
  ClipboardCheck
} from "lucide-react";

export const auditMenuItems = [
  {
    title: "Internal Audit",
    icon: Shield,
    subItems: [
      // ── Governance ──
      {
        title: "Governance",
        isGroupLabel: true,
      },
      {
        title: "Dashboard",
        url: "/audit/dashboard",
        icon: LayoutDashboard,
        requiresPermission: "view_audit_assignments",
        description: "Audit overview and KPIs"
      },
      {
        title: "Departments",
        url: "/audit/departments",
        icon: Users,
        requiresPermission: "configure_audit_system",
        description: "Manage department information"
      },
      {
        title: "Functions",
        url: "/audit/functions",
        icon: FileSearch,
        requiresPermission: "configure_audit_system",
        description: "Manage department functions"
      },
      {
        title: "Risk Assessment",
        url: "/audit/risk-assessment",
        icon: Target,
        requiresPermission: "configure_audit_system",
        description: "Assess function-level risks"
      },
      {
        title: "Risk Matrix",
        url: "/audit/risk-matrix",
        icon: Grid3X3,
        requiresPermission: "view_audit_assignments",
        description: "5×5 Impact vs Likelihood matrix"
      },
      // ── Planning ──
      {
        title: "Planning",
        isGroupLabel: true,
      },
      {
        title: "Audit Plans",
        url: "/audit/audit-plans",
        icon: FileText,
        requiresPermission: "create_audit_plans",
        description: "Risk-driven audit planning"
      },
      {
        title: "Plan Approval",
        url: "/audit/plan-approval",
        icon: ClipboardCheck,
        requiresPermission: "approve_audit_plans",
        description: "Review and approve submitted plans"
      },
      // ── Execution ──
      {
        title: "Execution",
        isGroupLabel: true,
      },
      {
        title: "Audits",
        url: "/audit/audits",
        icon: Briefcase,
        requiresPermission: "create_audit_plans",
        description: "Execute audits with checklists"
      },
      // ── Issues & Follow-up ──
      {
        title: "Issues & Follow-up",
        isGroupLabel: true,
      },
      {
        title: "Findings",
        url: "/audit/findings",
        icon: AlertCircle,
        requiresPermission: "enter_audit_findings",
        description: "Document and track findings"
      },
      {
        title: "Action Tracker",
        url: "/audit/actions",
        icon: CheckSquare,
        requiresPermission: "manage_audit_followups",
        description: "Track corrective actions"
      },
      // ── Reporting ──
      {
        title: "Reporting",
        isGroupLabel: true,
      },
      {
        title: "Report Center",
        url: "/audit/audit-reports",
        icon: BarChart3,
        requiresPermission: "generate_reports",
        description: "Create and manage audit reports"
      },
      {
        title: "Report Builder",
        url: "/audit/report-builder",
        icon: FileText,
        requiresPermission: "generate_reports",
        description: "Build professional audit reports"
      }
    ]
  }
];
