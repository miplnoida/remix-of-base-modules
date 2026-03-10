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
  TrendingUp,
  Shield,
  Mail,
  Globe,
  Target,
  Briefcase,
  BookOpen,
  Grid3X3,
  TestTube,
  Clock,
  Award,
  LayoutDashboard,
  FileBarChart,
  Bell
} from "lucide-react";

export const auditMenuItems = [
  {
    title: "Internal Audit",
    icon: Shield,
    subItems: [
      // Governance & Risk
      {
        title: "Risk Assessment",
        url: "/audit/risk-assessment",
        icon: Target,
        requiresPermission: "configure_audit_system",
        description: "Assess and score entity risks"
      },
      {
        title: "Executive Dashboard",
        url: "/audit/executive-dashboard",
        icon: LayoutDashboard,
        requiresPermission: "generate_reports",
        description: "High-level audit performance overview"
      },
      // Auditor Management
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
        title: "Time Tracking",
        url: "/audit/time-tracking",
        icon: Clock,
        requiresPermission: "execute_audit_activities",
        description: "Track auditor time and utilization"
      },
      {
        title: "Leave and Vacation Management",
        url: "/audit/leave",
        icon: CalendarDays,
        requiresPermission: "assign_auditors",
        description: "Manage leave requests, vacation, and time off"
      },
      {
        title: "Holiday Management",
        url: "/audit/holidays",
        icon: CalendarDays,
        requiresPermission: "assign_auditors",
        description: "Manage public and SSB-specific holidays"
      },
      // Audit Planning
      {
        title: "Audit Plans",
        url: "/audit/audit-plans",
        icon: FileText,
        requiresPermission: "create_audit_plans",
        description: "Create and manage audit plans"
      },
      {
        title: "Plan Approval",
        url: "/audit/plan-approval",
        icon: CheckSquare,
        requiresPermission: "approve_audit_plans",
        description: "Approve or reject audit plans"
      },
      {
        title: "Audit Engagements",
        url: "/audit/engagements",
        icon: Briefcase,
        requiresPermission: "create_audit_plans",
        description: "Manage formal audit engagements"
      },
      // Methodology
      {
        title: "Audit Programs",
        url: "/audit/audit-programs",
        icon: BookOpen,
        requiresPermission: "create_audit_plans",
        description: "Reusable audit programs and procedures"
      },
      {
        title: "Risk Control Matrix",
        url: "/audit/rcm",
        icon: Grid3X3,
        requiresPermission: "enter_audit_findings",
        description: "Map processes, risks, controls and tests"
      },
      {
        title: "Control Testing",
        url: "/audit/control-testing",
        icon: TestTube,
        requiresPermission: "execute_audit_activities",
        description: "Test and evaluate control effectiveness"
      },
      // Audit Execution
      {
        title: "Activity Calendar",
        url: "/audit/calendar",
        icon: Calendar,
        requiresPermission: "view_audit_assignments",
        description: "Schedule and manage audit activities"
      },
      {
        title: "Activity Workbench",
        url: "/audit/activity-workbench",
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
        title: "Working Papers",
        url: "/audit/working-papers",
        icon: FileText,
        requiresPermission: "enter_audit_findings",
        description: "Create and manage working papers with traceability"
      },
      {
        title: "Findings & Recommendations",
        url: "/audit/findings",
        icon: AlertCircle,
        requiresPermission: "enter_audit_findings",
        description: "Document audit findings and recommendations"
      },
      // Follow-up & Closure
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
        url: "/audit/follow-up-tracker",
        icon: AlertCircle,
        requiresPermission: "manage_audit_followups",
        description: "Track corrective actions and follow-ups"
      },
      {
        title: "Plan Closeout",
        url: "/audit/plan-closeout",
        icon: CheckSquare,
        requiresPermission: "approve_audit_closeouts",
        description: "Review and approve plan closeouts"
      },
      {
        title: "Quality Assurance Review",
        url: "/audit/quality-review",
        icon: Award,
        requiresPermission: "approve_audit_closeouts",
        description: "Independent review of completed audits"
      },
      // Reports & Communications
      {
        title: "Audit Reports",
        url: "/audit/audit-reports",
        icon: BarChart3,
        requiresPermission: "generate_reports",
        description: "Generate audit reports and analytics"
      },
      {
        title: "Committee Reports",
        url: "/audit/committee-reports",
        icon: FileBarChart,
        requiresPermission: "generate_reports",
        description: "Board and committee reporting packs"
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
      },
      {
        title: "Communication Center",
        url: "/audit/communication-center",
        icon: Mail,
        requiresPermission: "create_audit_plans",
        description: "Send official audit communications"
      },
      // Administration
      {
        title: "System Configuration",
        url: "/audit/config",
        icon: Settings,
        requiresPermission: "configure_audit_system",
        description: "Configure audit system settings"
      },
      {
        title: "SLA & Escalation Rules",
        url: "/audit/sla-rules",
        icon: Bell,
        requiresPermission: "configure_audit_system",
        description: "Manage SLA rules and escalation workflows"
      },
      {
        title: "Department Master",
        url: "/audit/departments",
        icon: Users,
        requiresPermission: "configure_audit_system",
        description: "Manage department information"
      },
      {
        title: "Function Master",
        url: "/audit/functions",
        icon: FileSearch,
        requiresPermission: "configure_audit_system",
        description: "Manage department functions and risk assessment"
      },
      {
        title: "Settings",
        icon: Settings,
        requiresPermission: "configure_audit_system",
        subItems: [
          {
            title: "Templates",
            url: "/audit/templates",
            icon: FileText,
            requiresPermission: "configure_audit_system",
            description: "Manage internal audit notification templates"
          }
        ]
      }
    ]
  }
];