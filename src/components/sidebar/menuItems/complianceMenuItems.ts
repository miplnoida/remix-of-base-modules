
import { 
  Shield, 
  LayoutDashboard, 
  FolderOpen,
  Calendar,
  MapPin,
  Bell,
  HandshakeIcon,
  FileText,
  TrendingUp,
  Settings
} from "lucide-react";

export const complianceMenuItems = [
  {
    title: "Compliance & Audit",
    icon: Shield,
    subItems: [
      {
        title: "Compliance Dashboard",
        url: "/compliance/dashboard",
        icon: LayoutDashboard,
        requiresPermission: "manage_compliance",
        description: "Visual overview of compliance metrics and trends"
      },
      {
        title: "Case Management",
        url: "/compliance/cases",
        icon: FolderOpen,
        requiresPermission: "manage_compliance",
        description: "View and manage all compliance cases"
      },
      {
        title: "Inspector Plans",
        url: "/compliance/inspector-plans",
        icon: Calendar,
        requiresPermission: "manage_compliance",
        description: "Weekly plans, approvals, and scheduling"
      },
      {
        title: "Field Operations",
        url: "/compliance/field-operations",
        icon: MapPin,
        requiresPermission: "conduct_inspections",
        description: "Check-in/check-out, evidence upload, working papers"
      },
      {
        title: "Notices & Communication",
        url: "/compliance/notices",
        icon: Bell,
        requiresPermission: "manage_compliance",
        description: "Send and track compliance notices"
      },
      {
        title: "Payment Arrangements",
        url: "/compliance/arrangements",
        icon: HandshakeIcon,
        requiresPermission: "manage_compliance",
        description: "Manage payment arrangements and installments"
      },
      {
        title: "Employer Statements",
        url: "/compliance/employer-statements",
        icon: FileText,
        requiresPermission: "view_financial_data",
        description: "Generate as-of-date employer statements"
      },
      {
        title: "Reports",
        url: "/compliance/reports",
        icon: TrendingUp,
        requiresPermission: "generate_reports",
        description: "Compliance analytics and performance reports"
      },
      {
        title: "Audit Planning",
        url: "/compliance/audit-planning/sampling-dashboard",
        icon: Calendar,
        requiresPermission: "manage_compliance",
        description: "Risk & sampling dashboard, monthly candidates"
      },
      {
        title: "Settings",
        url: "/compliance/settings",
        icon: Settings,
        requiresPermission: "manage_compliance",
        description: "Configure C3 grace periods, penalties, and rules"
      }
    ]
  }
];
