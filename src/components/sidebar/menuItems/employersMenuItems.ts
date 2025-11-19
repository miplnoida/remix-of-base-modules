import { 
  Building2,
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  CheckCircle
} from "lucide-react";

export const employersMenuItems = [
  {
    title: "Employers",
    icon: Building2,
    subItems: [
      {
        title: "Dashboard",
        url: "/employers-management/dashboard",
        icon: BarChart3,
        requiresPermission: "view_dashboard"
      },
      {
        title: "Management",
        url: "/employers-management/manage",
        icon: Users,
        requiresPermission: "manage_employers"
      },
      {
        title: "Reports",
        icon: FileText,
        requiresPermission: "view_reports",
        subItems: [
          {
            title: "Registered Summary",
            url: "/employers/reports/registered-summary",
            icon: BarChart3,
            requiresPermission: "view_reports"
          },
          {
            title: "Active vs Inactive",
            url: "/employers/reports/active-inactive",
            icon: TrendingUp,
            requiresPermission: "view_reports"
          },
          {
            title: "Contribution Compliance",
            url: "/employers/reports/contribution-compliance",
            icon: CheckCircle,
            requiresPermission: "view_reports"
          }
        ]
      }
    ]
  }
];
