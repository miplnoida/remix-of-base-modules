import { 
  Building2, 
  BarChart3,
  Users,
  FileText,
  Settings
} from "lucide-react";

export const c3MenuItems = [
  {
    title: "C3 Management",
    icon: Building2,
    subItems: [
      {
        title: "Dashboard",
        url: "/c3-management/dashboard",
        icon: BarChart3,
        requiresPermission: "view_dashboard",
        description: "View C3 statistics and overview"
      },
      {
        title: "Manage C3",
        url: "/c3-management/manage",
        icon: Users,
        requiresPermission: "view_dashboard",
        description: "Add and manage C3 contribution records"
      },
      {
        title: "Configure Electronic C3",
        url: "/c3-management/configure-electronic-c3",
        icon: Settings,
        requiresPermission: "view_dashboard",
        description: "Setup directories, parameters, and notifications"
      },
      {
        title: "C3 Reports",
        url: "/c3-management/reports",
        icon: FileText,
        requiresPermission: "view_reports",
        description: "Generate and view C3 reports"
      },
      {
        title: "Verification Queue",
        url: "/c3-management/verification",
        icon: BarChart3,
        requiresPermission: "verify_c3",
        description: "Review and verify pending C3 records"
      }
    ]
  }
];