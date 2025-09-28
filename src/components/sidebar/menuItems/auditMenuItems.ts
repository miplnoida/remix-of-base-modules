import { 
  Clipboard, 
  Calendar, 
  CheckSquare, 
  FileText, 
  BarChart3,
  Users,
  Settings,
  AlertCircle
} from "lucide-react";

export const auditMenuItems = [
  {
    title: "Audit Management",
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
      },
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
      },
      {
        title: "Audit Reports",
        url: "/audit/reports",
        icon: BarChart3,
        requiresPermission: "generate_reports",
        description: "Generate audit reports and analytics"
      },
      {
        title: "System Configuration",
        url: "/audit/config",
        icon: Settings,
        requiresPermission: "configure_audit_system",
        description: "Configure audit system settings"
      }
    ]
  }
];