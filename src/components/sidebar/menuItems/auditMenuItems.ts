import { 
  Clipboard, 
  Calendar, 
  CheckSquare, 
  FileText, 
  BarChart3,
  Users,
  Settings,
  AlertCircle,
  UserCheck,
  CalendarDays,
  FileSearch,
  MessageSquare,
  FileText as FileTextIcon,
  TrendingUp
} from "lucide-react";

export const auditMenuItems = [
  {
    title: "Auditor Management",
    icon: Users,
    subItems: [
      {
        title: "Auditor Profiles",
        url: "/audit/auditors",
        icon: UserCheck,
        requiresPermission: "configure_audit_system",
        description: "Manage auditor profiles and credentials"
      },
      {
        title: "Workload & Capacity",
        url: "/audit/workload",
        icon: TrendingUp,
        requiresPermission: "assign_auditors",
        description: "View auditor capacity and assignments"
      },
      {
        title: "Leave Management",
        url: "/audit/leave",
        icon: CalendarDays,
        requiresPermission: "assign_auditors",
        description: "Manage leave requests and approvals"
      }
    ]
  },
  {
    title: "Audit Planning",
    icon: Clipboard,
    subItems: [
      {
        title: "Audit Plans",
        url: "/audit/plans",
        icon: FileText,
        requiresPermission: "create_audit_plans",
        description: "Create and manage audit plans"
      },
      {
        title: "Plan Approval",
        url: "/audit/approvals",
        icon: CheckSquare,
        requiresPermission: "approve_audit_plans",
        description: "Approve or reject audit plans"
      }
    ]
  },
  {
    title: "Audit Execution",
    icon: FileSearch,
    subItems: [
      {
        title: "Activity Calendar",
        url: "/audit/calendar",
        icon: Calendar,
        requiresPermission: "view_audit_assignments",
        description: "Schedule and manage audit activities"
      },
      {
        title: "Activity Workbench",
        url: "/audit/workbench",
        icon: Clipboard,
        requiresPermission: "execute_audit_activities",
        description: "Execute audit activities and enter findings"
      },
      {
        title: "Evidence Management",
        url: "/audit/evidence",
        icon: FileTextIcon,
        requiresPermission: "enter_audit_findings",
        description: "Upload and manage audit evidence"
      },
      {
        title: "Findings & Recommendations",
        url: "/audit/findings",
        icon: AlertCircle,
        requiresPermission: "enter_audit_findings",
        description: "Document audit findings and recommendations"
      }
    ]
  },
  {
    title: "Follow-up & Closure",
    icon: CheckSquare,
    subItems: [
      {
        title: "Management Responses",
        url: "/audit/responses",
        icon: MessageSquare,
        requiresPermission: "view_audit_assignments",
        description: "Review management responses to findings"
      },
      {
        title: "Action Tracking",
        url: "/audit/actions",
        icon: AlertCircle,
        requiresPermission: "manage_audit_followups",
        description: "Track implementation of corrective actions"
      },
      {
        title: "Follow-Up Tracker",
        url: "/audit/followups",
        icon: AlertCircle,
        requiresPermission: "manage_audit_followups",
        description: "Track corrective actions and follow-ups"
      },
      {
        title: "Plan Closeout",
        url: "/audit/closeout",
        icon: CheckSquare,
        requiresPermission: "approve_audit_closeouts",
        description: "Review and approve plan closeouts"
      }
    ]
  },
  {
    title: "Reports & Communications",
    icon: BarChart3,
    subItems: [
      {
        title: "Audit Reports",
        url: "/audit/reports",
        icon: BarChart3,
        requiresPermission: "generate_reports",
        description: "Generate audit reports and analytics"
      },
      {
        title: "Letter Generation",
        url: "/audit/letters",
        icon: FileText,
        requiresPermission: "create_audit_plans",
        description: "Generate audit letters and notices"
      },
      {
        title: "Report Builder",
        url: "/audit/report-builder",
        icon: FileTextIcon,
        requiresPermission: "enter_audit_findings",
        description: "Build and finalize audit reports"
      }
    ]
  },
  {
    title: "Administration",
    icon: Settings,
    subItems: [
      {
        title: "System Configuration",
        url: "/audit/config",
        icon: Settings,
        requiresPermission: "configure_audit_system",
        description: "Configure audit system settings"
      },
      {
        title: "Department Master",
        url: "/audit/departments",
        icon: Users,
        requiresPermission: "configure_audit_system",
        description: "Manage department information"
      }
    ]
  }
];