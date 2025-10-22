import {
  ClipboardList,
  FileText,
  DollarSign,
  Search,
  Smartphone,
  Users,
  Shield,
  BarChart3,
  UserPlus,
  Calendar,
  Map,
  Settings
} from "lucide-react";

export const bemaComplianceMenuItems = [
  {
    title: "BeMA Compliance",
    icon: Shield,
    subItems: [
      {
        title: "Dashboard",
        url: "/bema/dashboard",
        icon: BarChart3,
        description: "Overview & KPIs"
      },
      {
        title: "Workplan Management",
        url: "/bema/workplan",
        icon: Calendar,
        description: "Monitor & approve inspector workplans"
      },
      {
        title: "Registration & Onboarding",
        url: "/bema/registrations",
        icon: UserPlus,
        description: "Register employers, self-employed & voluntary contributors"
      },
      {
        title: "C3 Filing Management",
        url: "/bema/c3-filing",
        icon: FileText,
        description: "Online C3 submissions, validation & queries"
      },
      {
        title: "Arrears & Debt Tracking",
        url: "/bema/arrears",
        icon: DollarSign,
        description: "Employer arrears ledger & payment plans"
      },
      {
        title: "Audits & Investigations",
        url: "/bema/audits",
        icon: Search,
        description: "Case management, surveys & scouting"
      },
      {
        title: "Inspector Field Work",
        url: "/bema/inspector-mobile",
        icon: Smartphone,
        description: "Mobile workflow & weekly plans"
      },
      {
        title: "Self-Employed & Voluntary",
        url: "/bema/contributors",
        icon: Users,
        description: "Contributor management & voucher generation"
      },
      {
        title: "Waivers & Escalation",
        url: "/bema/waivers",
        icon: ClipboardList,
        description: "Waiver requests & legal escalation"
      },
      {
        title: "Reports & Dashboards",
        url: "/bema/reports",
        icon: BarChart3,
        description: "KPIs, activity logs & analytics"
      },
      {
        title: "Zone Management",
        url: "/bema/zones",
        icon: Map,
        description: "Inspector zones & assignments"
      },
      {
        title: "Scouting Review",
        url: "/bema/scouting",
        icon: Search,
        description: "Unregistered employer detection"
      },
      {
        title: "Admin & Config",
        url: "/bema/admin/rules",
        icon: Settings,
        description: "Rules, templates, roles & logs"
      }
    ]
  }
];
