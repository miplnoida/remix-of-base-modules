import { 
  Building2, 
  BarChart3,
  Users,
  FileText,
  Settings,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Calculator,
  UserCheck
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
        title: "C3 Simulation",
        url: "/c3-management/simulation",
        icon: Calculator,
        requiresPermission: "view_dashboard"
      },
      {
        title: "C3 Details",
        icon: FileText,
        requiresPermission: "view_dashboard",
        subItems: [
          {
            title: "C3 Contribution",
            url: "/c3-management/c3-contribution",
            icon: DollarSign,
            requiresPermission: "view_dashboard"
          },
          {
            title: "NW Director",
            url: "/c3-management/nw-director",
            icon: Users,
            requiresPermission: "view_dashboard"
          },
          {
            title: "Self Employed",
            url: "/c3-management/self-employed-c3",
            icon: UserCheck,
            requiresPermission: "view_dashboard"
          }
        ]
      },
      {
        title: "Employer Details",
        url: "/c3-management/employer-details",
        icon: UserCheck,
        requiresPermission: "view_dashboard"
      },
      {
        title: "Self Employee Details",
        url: "/c3-management/self-employed-details",
        icon: Users,
        requiresPermission: "view_dashboard"
      },
      {
        title: "Payment Details",
        url: "/c3-management/payment-details",
        icon: DollarSign,
        requiresPermission: "view_dashboard"
      },
      {
        title: "Settings",
        icon: Settings,
        requiresPermission: "view_dashboard",
        subItems: [
          {
            title: "Levy Settings",
            url: "/c3-management/settings/levy/schemes",
            icon: Settings,
            requiresPermission: "view_dashboard"
          },
          {
            title: "Social Security Contribution",
            url: "/c3-management/settings/ss/schemes",
            icon: Settings,
            requiresPermission: "view_dashboard"
          },
          {
            title: "Severance Settings",
            url: "/c3-management/settings/severance/schemes",
            icon: Settings,
            requiresPermission: "view_dashboard"
          },
          {
            title: "Employment Injury Settings",
            url: "/c3-management/settings/injury/schemes",
            icon: Settings,
            requiresPermission: "view_dashboard"
          },
          {
            title: "C3 File Configuration",
            url: "/c3-management/settings/c3file/formats",
            icon: Settings,
            requiresPermission: "view_dashboard"
          }
        ]
      },
      {
        title: "Reports",
        icon: FileText,
        requiresPermission: "view_reports",
        subItems: [
          {
            title: "C3 Entry & Verification",
            url: "/c3/reports/c3-entry-verification",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Pending C3 Schedules",
            url: "/c3/reports/pending-c3",
            icon: AlertTriangle,
            requiresPermission: "view_reports"
          },
          {
            title: "C3s Missing SSN",
            url: "/c3/reports/missing-ssn",
            icon: AlertTriangle,
            requiresPermission: "view_reports"
          },
          {
            title: "C3 Line-Item Changes",
            url: "/c3/reports/c3-line-item-changes",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Electronic C3 Uploads",
            url: "/c3/reports/electronic-c3-uploads",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "C3s Without Payment",
            url: "/c3/reports/c3-without-payment",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Employer Notifications",
            url: "/c3/reports/employer-notifications",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "High-Wage Multi-Employer",
            url: "/c3/reports/high-wage-multi-employer",
            icon: TrendingUp,
            requiresPermission: "view_reports"
          },
          {
            title: "Scanning Activity",
            url: "/c3/reports/scanning-activity",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Outstanding Discrepancies",
            url: "/c3/reports/outstanding-discrepancies",
            icon: AlertTriangle,
            requiresPermission: "view_reports"
          },
          {
            title: "Long-Term Claims",
            url: "/c3/reports/long-term-claims",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Internal Audit Sample",
            url: "/c3/reports/audit-sample",
            icon: FileText,
            requiresPermission: "view_reports"
          },
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