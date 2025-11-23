import { 
  Scale, 
  Briefcase,
  Calendar,
  FileText,
  Gavel,
  TrendingDown,
  Settings,
  BarChart3,
  FolderOpen,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";

export const legalManagementMenuItems = [
  {
    title: "Legal Management",
    icon: Scale,
    subItems: [
      {
        title: "Legal Dashboard",
        url: "/legal/dashboard",
        icon: BarChart3,
        requiresPermission: "view_legal",
        description: "Overview of all legal cases and metrics"
      },
      {
        title: "Legal Workbench",
        url: "/legal/workbench",
        icon: Briefcase,
        requiresPermission: "view_legal",
        description: "All legal subcases management"
      },
      {
        title: "Case Management",
        icon: FolderOpen,
        requiresPermission: "view_legal",
        subItems: [
          {
            title: "All Cases",
            url: "/legal/cases",
            icon: FolderOpen,
            requiresPermission: "view_legal",
            description: "View and manage all legal cases"
          },
          {
            title: "New Case Intake",
            url: "/legal/cases/intake",
            icon: FileText,
            requiresPermission: "create_legal_case",
            description: "Create new legal case"
          },
          {
            title: "Delinquent Cases",
            url: "/legal/cases/delinquent",
            icon: TrendingDown,
            requiresPermission: "view_legal",
            description: "Cases with overdue payments"
          }
        ]
      },
      {
        title: "Hearings Calendar",
        url: "/legal/hearings",
        icon: Calendar,
        requiresPermission: "view_legal",
        description: "Court hearings schedule"
      },
      {
        title: "Court Orders & Enforcement",
        icon: Gavel,
        requiresPermission: "view_legal",
        subItems: [
          {
            title: "Court Orders",
            url: "/legal/court-orders",
            icon: Gavel,
            requiresPermission: "view_legal",
            description: "Record and manage court orders"
          },
          {
            title: "Enforcement Actions",
            url: "/legal/enforcement",
            icon: AlertTriangle,
            requiresPermission: "manage_enforcement",
            description: "Writs, warrants, and garnishments"
          },
          {
            title: "Payment Plans",
            url: "/legal/payment-plans",
            icon: DollarSign,
            requiresPermission: "view_legal",
            description: "Court-ordered installment plans"
          }
        ]
      },
      {
        title: "Legal Reports",
        icon: BarChart3,
        requiresPermission: "view_legal_reports",
        subItems: [
          {
            title: "Cases by Stage",
            url: "/legal/reports/cases-by-stage",
            icon: BarChart3,
            requiresPermission: "view_legal_reports",
            description: "Filed, judgment, enforcement, closed"
          },
          {
            title: "Recovery Analysis",
            url: "/legal/reports/recovery",
            icon: DollarSign,
            requiresPermission: "view_legal_reports",
            description: "Recovery vs court-ordered amounts"
          },
          {
            title: "Aging Receivables",
            url: "/legal/reports/aging",
            icon: Clock,
            requiresPermission: "view_legal_reports",
            description: "Legal receivables aging buckets"
          },
          {
            title: "Court Costs & Fees",
            url: "/legal/reports/costs-fees",
            icon: DollarSign,
            requiresPermission: "view_legal_reports",
            description: "Legal fees and court cost revenue"
          },
          {
            title: "Performance Metrics",
            url: "/legal/reports/performance",
            icon: TrendingDown,
            requiresPermission: "view_legal_reports",
            description: "Time to judgment, recovery rates"
          },
          {
            title: "Pending Hearings",
            url: "/legal/reports/pending-hearings",
            icon: Calendar,
            requiresPermission: "view_legal_reports",
            description: "Upcoming hearings and backlog"
          }
        ]
      },
      {
        title: "Legal Settings",
        icon: Settings,
        requiresPermission: "manage_legal_settings",
        subItems: [
          {
            title: "Courts & Judges",
            url: "/legal/settings/courts",
            icon: Gavel,
            requiresPermission: "manage_legal_settings",
            description: "Manage court and judge master data"
          },
          {
            title: "Hearing Types",
            url: "/legal/settings/hearing-types",
            icon: Calendar,
            requiresPermission: "manage_legal_settings",
            description: "Configure hearing types"
          },
          {
            title: "Case Statuses",
            url: "/legal/settings/statuses",
            icon: CheckCircle,
            requiresPermission: "manage_legal_settings",
            description: "Legal case status configuration"
          },
          {
            title: "Legal Roles",
            url: "/legal/settings/roles",
            icon: Users,
            requiresPermission: "manage_legal_settings",
            description: "Plaintiff, defendant, garnishee roles"
          },
          {
            title: "Fee Mappings",
            url: "/legal/settings/fee-mappings",
            icon: DollarSign,
            requiresPermission: "manage_legal_settings",
            description: "Map legal events to fee codes"
          },
          {
            title: "Territory Settings",
            url: "/legal/settings/territory",
            icon: Settings,
            requiresPermission: "manage_legal_settings",
            description: "St Kitts vs Nevis court mappings"
          }
        ]
      }
    ]
  }
];
