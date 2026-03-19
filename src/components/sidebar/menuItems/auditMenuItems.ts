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
  BarChart3
} from "lucide-react";

export const auditMenuItems = [
  {
    title: "Internal Audit",
    icon: Shield,
    subItems: [
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
      {
        title: "Audit Plans",
        url: "/audit/audit-plans",
        icon: FileText,
        requiresPermission: "create_audit_plans",
        description: "Risk-driven audit planning"
      },
      {
        title: "Audits",
        url: "/audit/audits",
        icon: Briefcase,
        requiresPermission: "create_audit_plans",
        description: "Execute audits with checklists"
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
      {
        title: "Reports",
        url: "/audit/audit-reports",
        icon: BarChart3,
        requiresPermission: "generate_reports",
        description: "Audit reports and analytics"
      }
    ]
  }
];
