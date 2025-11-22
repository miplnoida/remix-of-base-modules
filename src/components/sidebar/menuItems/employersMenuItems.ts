import { 
  Building2,
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  XCircle,
  Clock,
  Scale,
  FileX,
  Briefcase,
  Globe,
  UserX,
  Settings
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
          },
          {
            title: "Non-Paying 3 Months",
            url: "/employers/reports/non-paying-3-months",
            icon: AlertTriangle,
            requiresPermission: "view_reports"
          },
          {
            title: "Non-Paying 6 Months",
            url: "/employers/reports/non-paying-6-months",
            icon: AlertTriangle,
            requiresPermission: "view_reports"
          },
          {
            title: "Non-Paying 9 Months",
            url: "/employers/reports/non-paying-9-months",
            icon: AlertTriangle,
            requiresPermission: "view_reports"
          },
          {
            title: "Top Missing C3 Submissions",
            url: "/employers/reports/top-missing-c3",
            icon: FileX,
            requiresPermission: "view_reports"
          },
          {
            title: "Missing C3 Per Zone",
            url: "/employers/reports/missing-c3-per-zone",
            icon: FileX,
            requiresPermission: "view_reports"
          },
          {
            title: "C3 Without Payment",
            url: "/employers/reports/c3-without-payment",
            icon: XCircle,
            requiresPermission: "view_reports"
          },
          {
            title: "No Payment Per Zone",
            url: "/employers/reports/no-payment-per-zone",
            icon: XCircle,
            requiresPermission: "view_reports"
          },
          {
            title: "Employee Turnover",
            url: "/employers/reports/employee-turnover",
            icon: Users,
            requiresPermission: "view_reports"
          },
          {
            title: "By Employee Count",
            url: "/employers/reports/by-employee-count",
            icon: Users,
            requiresPermission: "view_reports"
          },
          {
            title: "By Monthly Contributions",
            url: "/employers/reports/by-monthly-contributions",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "By Arrears Amount",
            url: "/employers/reports/by-arrears",
            icon: AlertTriangle,
            requiresPermission: "view_reports"
          },
          {
            title: "By Waivers Granted",
            url: "/employers/reports/by-waivers",
            icon: CheckCircle,
            requiresPermission: "view_reports"
          },
          {
            title: "Waivers Per Zone",
            url: "/employers/reports/waivers-per-zone",
            icon: CheckCircle,
            requiresPermission: "view_reports"
          },
          {
            title: "Employees Per Zone",
            url: "/employers/reports/employees-per-zone",
            icon: Users,
            requiresPermission: "view_reports"
          },
          {
            title: "Contributions Per Zone",
            url: "/employers/reports/contributions-per-zone",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears Per Zone",
            url: "/employers/reports/arrears-per-zone",
            icon: AlertTriangle,
            requiresPermission: "view_reports"
          },
          {
            title: "With Most Queries",
            url: "/employers/reports/most-queries",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Queries Per Zone",
            url: "/employers/reports/queries-per-zone",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "By Litigation Count",
            url: "/employers/reports/by-litigation",
            icon: Scale,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears Over 50K",
            url: "/employers/reports/arrears-over-50k",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears Over 100K",
            url: "/employers/reports/arrears-over-100k",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears Over 200K",
            url: "/employers/reports/arrears-over-200k",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears Over 300K",
            url: "/employers/reports/arrears-over-300k",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears Over 400K",
            url: "/employers/reports/arrears-over-400k",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears 50K+ By Zone",
            url: "/employers/reports/arrears-50k-by-zone",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Top Compliant",
            url: "/employers/reports/top-compliant",
            icon: CheckCircle,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears 30 Days",
            url: "/employers/reports/arrears-30-days",
            icon: Clock,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears 60 Days",
            url: "/employers/reports/arrears-60-days",
            icon: Clock,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears 90 Days",
            url: "/employers/reports/arrears-90-days",
            icon: Clock,
            requiresPermission: "view_reports"
          },
          {
            title: "Arrears Over 90 Days",
            url: "/employers/reports/arrears-over-90-days",
            icon: Clock,
            requiresPermission: "view_reports"
          },
          {
            title: "Under Litigation",
            url: "/employers/reports/under-litigation",
            icon: Scale,
            requiresPermission: "view_reports"
          },
          {
            title: "With Payment Plans",
            url: "/employers/reports/with-payment-plans",
            icon: Briefcase,
            requiresPermission: "view_reports"
          },
          {
            title: "Defaulted Plans",
            url: "/employers/reports/defaulted-plans",
            icon: XCircle,
            requiresPermission: "view_reports"
          },
          {
            title: "Ceased Employers",
            url: "/employers/reports/ceased",
            icon: UserX,
            requiresPermission: "view_reports"
          },
          {
            title: "Out of Federation",
            url: "/employers/reports/out-of-federation",
            icon: Globe,
            requiresPermission: "view_reports"
          },
          {
            title: "Deceased Employers",
            url: "/employers/reports/deceased",
            icon: UserX,
            requiresPermission: "view_reports"
          },
          {
            title: "Overseas Submissions",
            url: "/employers/reports/overseas-submissions",
            icon: Globe,
            requiresPermission: "view_reports"
          },
          {
            title: "NIL Returns 3 Months",
            url: "/employers/reports/nil-returns-3-months",
            icon: FileX,
            requiresPermission: "view_reports"
          },
          {
            title: "NIL Returns Over 3 Months",
            url: "/employers/reports/nil-returns-over-3-months",
            icon: FileX,
            requiresPermission: "view_reports"
          }
        ]
      },
      {
        title: "Settings",
        icon: Settings,
        requiresPermission: "manage_settings",
        subItems: [
          {
            title: "Templates",
            url: "/employers/templates",
            icon: FileText,
            requiresPermission: "manage_templates"
          }
        ]
      }
    ]
  }
];
