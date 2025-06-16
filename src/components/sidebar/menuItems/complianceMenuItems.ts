
import { 
  Shield, 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Gavel, 
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
        requiresPermission: "manage_compliance"
      },
      {
        title: "Employer Compliance",
        url: "/compliance/employer",
        icon: Building2,
        requiresPermission: "manage_compliance"
      },
      {
        title: "Compliance Reports",
        url: "/compliance/reports",
        icon: FileText,
        requiresPermission: "generate_reports"
      },
      {
        title: "Legal Proceedings",
        url: "/compliance/legal",
        icon: Gavel,
        requiresPermission: "manage_legal_proceedings"
      },
      {
        title: "Audit Management",
        url: "/compliance/audits",
        icon: Clipboard,
        requiresPermission: "conduct_inspections"
      },
      {
        title: "Penalty Management",
        url: "/compliance/penalties",
        icon: AlertTriangle,
        requiresPermission: "manage_compliance"
      }
    ]
  }
];
