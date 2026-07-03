import { 
  Scale, 
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
  Clock,
  Briefcase,
  UserCheck,
  Megaphone,
  ListChecks,
  Workflow
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
            title: "Judicial Orders & Judgments",
            url: "/legal/lg/orders",
            icon: Gavel,
            requiresPermission: "view_legal",
            description: "EPIC-06B — Orders, appeals, enforcement, compliance"
          },
          // Legacy routes retained as redirects only — not exposed in menu.
          // /legal/court-orders, /legal/enforcement, /legal/payment-plans redirect to /legal/lg/orders (EPIC-06B).
        ]
      },
      {
        title: "Legal Recovery",
        icon: Briefcase,
        requiresPermission: "view_legal",
        subItems: [
          {
            title: "Legal Recovery Assignments",
            url: "/legal/lg/recovery-assignments",
            icon: ListChecks,
            requiresPermission: "view_legal",
            description: "EPIC-06D — All legal recovery assignments workbench"
          },
          {
            title: "My Legal Recoveries",
            url: "/legal/lg/recovery-assignments?view=my",
            icon: UserCheck,
            requiresPermission: "view_legal",
            description: "Legal recovery assignments owned by me"
          },
          {
            title: "Team Legal Recoveries",
            url: "/legal/lg/recovery-assignments?view=team",
            icon: Users,
            requiresPermission: "view_legal",
            description: "Legal recovery assignments across my team"
          },
          {
            title: "Legal Recovery Campaigns",
            url: "/legal/lg/recovery-campaigns",
            icon: Megaphone,
            requiresPermission: "view_legal",
            description: "Active and historical legal recovery campaigns"
          },
          {
            title: "Legal Recovery Admin",
            icon: Settings,
            requiresPermission: "manage_legal_settings",
            subItems: [
              {
                title: "Strategy Types",
                url: "/legal/admin/recovery-strategy-types",
                icon: Workflow,
                requiresPermission: "manage_legal_settings",
                description: "Configure legal recovery strategy playbooks"
              },
              {
                title: "Campaign Types",
                url: "/legal/admin/recovery-campaign-types",
                icon: Megaphone,
                requiresPermission: "manage_legal_settings",
                description: "Configure legal recovery campaign types"
              },
              {
                title: "Workload Rules",
                url: "/legal/admin/recovery-workload-rules",
                icon: Users,
                requiresPermission: "manage_legal_settings",
                description: "Officer capacity and assignment routing rules"
              }
            ]
          }
        ]
      },
      {
        title: "Reports",
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
        title: "Settings",
        icon: Settings,
        requiresPermission: "manage_legal_settings",
        subItems: [
          {
            title: "Case Stages & Statuses",
            url: "/legal/settings/workflow",
            icon: CheckCircle,
            requiresPermission: "manage_legal_settings",
            description: "Manage case stages and statuses"
          },
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
