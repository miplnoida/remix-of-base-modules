import {
  Shield,
  LayoutDashboard,
  Users,
  FileSearch,
  Target,
  Grid3X3,
  FileText,
  Briefcase,
  BarChart3,
  ClipboardCheck,
  Calendar,
  Clock,
  Settings,
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
      // ── Settings ──
      {
        title: "Settings",
        isGroupLabel: true,
      },
      {
        title: "System Configuration",
        url: "/audit/config",
        icon: Settings,
        requiresPermission: "configure_audit_system",
        description: "Workflow defaults, notifications, SLA, and general audit module behavior"
      },
      {
        title: "Risk Configuration",
        url: "/audit/risk-settings",
        icon: Shield,
        requiresPermission: "configure_audit_system",
        description: "Likelihood, impact, formula, rating bands, and risk derivation"
      },
      // ── Resources ──
      {
        title: "Resources",
        isGroupLabel: true,
      },
      {
        title: "Holiday Calendar",
        url: "/audit/holidays",
        icon: Calendar,
        requiresPermission: "view_audit_assignments",
        description: "Public holidays and non-working days"
      },
      {
        title: "Auditor Leave",
        url: "/audit/leave",
        icon: Clock,
        requiresPermission: "view_audit_assignments",
        description: "Manage auditor leave schedules"
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
      }
    ]
  }
];
