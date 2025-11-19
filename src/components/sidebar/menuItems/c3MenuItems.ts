import { 
  Building2, 
  BarChart3,
  Users,
  FileText,
  Settings,
  DollarSign,
  AlertTriangle,
  TrendingUp
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
        requiresPermission: "view_dashboard"
      },
      {
        title: "Manage C3",
        url: "/c3-management/manage",
        icon: Users,
        requiresPermission: "view_dashboard"
      },
      {
        title: "Configure Electronic C3",
        url: "/c3-management/configure-electronic-c3",
        icon: Settings,
        requiresPermission: "view_dashboard"
      },
      {
        title: "Verification Queue",
        url: "/c3-management/verification",
        icon: BarChart3,
        requiresPermission: "verify_c3"
      },
      {
        title: "Reports",
        icon: FileText,
        requiresPermission: "view_reports",
        subItems: [
          {
            title: "Monthly Collections",
            url: "/c3/reports/monthly-collections",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Contribution Arrears",
            url: "/c3/reports/arrears",
            icon: AlertTriangle,
            requiresPermission: "view_reports"
          },
          {
            title: "Top Contributors",
            url: "/c3/reports/top-contributors",
            icon: TrendingUp,
            requiresPermission: "view_reports"
          }
        ]
      }
    ]
  }
];