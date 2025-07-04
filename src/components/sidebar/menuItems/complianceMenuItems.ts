
import { 
  Shield, 
  LayoutDashboard, 
  Eye,
  Building2, 
  FileText, 
  Clipboard, 
  AlertTriangle
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
        title: "Compliance Monitoring",
        url: "/compliance/monitoring",
        icon: Eye,
        requiresPermission: "manage_compliance",
        description: "Monitor deadlines, send notices, schedule visits"
      },
      {
        title: "Employer Compliance",
        url: "/compliance/employer",
        icon: Building2,
        requiresPermission: "manage_compliance",
        description: "Individual employer compliance status and history"
      },
      {
        title: "Compliance Reports",
        url: "/compliance/reports",
        icon: FileText,
        requiresPermission: "generate_reports",
        description: "Warnings issued, notices sent, export logs"
      },
      {
        title: "Audit Management",
        url: "/compliance/audits",
        icon: Clipboard,
        requiresPermission: "conduct_inspections",
        description: "Schedule audits, assign inspectors, track status"
      },
      {
        title: "Penalty Management",
        url: "/compliance/penalties",
        icon: AlertTriangle,
        requiresPermission: "manage_compliance",
        description: "Manage fines, payment notices, penalty tracking"
      }
    ]
  }
];
