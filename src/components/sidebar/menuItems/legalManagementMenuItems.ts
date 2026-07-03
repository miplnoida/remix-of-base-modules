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
        title: "Legal Reports & Analytics",
        icon: BarChart3,
        requiresPermission: "view_legal",
        subItems: [
          {
            title: "Reports Centre",
            url: "/legal/reports",
            icon: BarChart3,
            requiresPermission: "view_legal",
            description: "EPIC-09A — Full legal reports catalogue"
          },
          {
            title: "Executive Analytics",
            url: "/legal/reports/executive",
            icon: TrendingDown,
            requiresPermission: "view_legal",
            description: "Board-level KPIs and drilldowns"
          },
          {
            title: "Operational Reports",
            url: "/legal/reports?tab=catalog&cat=operational",
            icon: FolderOpen,
            requiresPermission: "view_legal",
            description: "Matters, hearings, tasks and deadlines"
          },
          {
            title: "Financial Reports",
            url: "/legal/reports?tab=catalog&cat=financial",
            icon: DollarSign,
            requiresPermission: "view_legal",
            description: "Assessed / Paid / Outstanding reconciled to v_lg_case_financials"
          },
          {
            title: "Compliance Referral Reports",
            url: "/legal/reports?tab=catalog&cat=compliance_referral",
            icon: FileText,
            requiresPermission: "view_legal",
            description: "Compliance → Legal handoff analytics"
          },
          {
            title: "Judicial Reports",
            url: "/legal/reports?tab=catalog&cat=judicial",
            icon: Gavel,
            requiresPermission: "view_legal",
            description: "Court, judgment and enforcement analytics"
          },
          {
            title: "Recovery Reports",
            url: "/legal/reports?tab=catalog&cat=recovery",
            icon: Briefcase,
            requiresPermission: "view_legal",
            description: "Post-judgment legal recovery"
          },
          {
            title: "Workload Reports",
            url: "/legal/reports?tab=catalog&cat=workload",
            icon: Users,
            requiresPermission: "view_legal",
            description: "Officer, team and matter workload"
          },
          {
            title: "External Counsel Reports",
            url: "/legal/reports?tab=catalog&cat=external_counsel",
            icon: UserCheck,
            requiresPermission: "view_legal",
            description: "External counsel engagements and fees"
          },
          {
            title: "Saved Reports",
            url: "/legal/reports?tab=saved",
            icon: CheckCircle,
            requiresPermission: "view_legal",
            description: "Your saved report configurations"
          },
          {
            title: "Scheduled Reports",
            url: "/legal/reports?tab=scheduled",
            icon: Clock,
            requiresPermission: "view_legal",
            description: "Automated email delivery of legal reports"
          },
          {
            title: "Export Audit",
            url: "/legal/reports?tab=audit",
            icon: AlertTriangle,
            requiresPermission: "view_legal",
            description: "Every report export is audited"
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
      },
      {
        title: "Legal Administration",
        icon: Settings,
        requiresPermission: "view_legal",
        subItems: [
          {
            title: "Document Automation",
            url: "/legal/lg/documents",
            icon: FileText,
            requiresPermission: "view_legal",
            description: "Generate, approve, issue and dispatch legal correspondence"
          },
          {
            title: "Template Registry",
            url: "/legal/admin/template-registry",
            icon: ListChecks,
            requiresPermission: "manage_legal_settings",
            description: "Map template codes to core_template rows"
          },
          {
            title: "Generated Documents",
            url: "/legal/lg/documents",
            icon: FolderOpen,
            requiresPermission: "view_legal",
            description: "History of generated legal documents"
          },
          {
            title: "UAT Documents",
            url: "/legal/admin/uat-documents",
            icon: FolderOpen,
            requiresPermission: "view_legal",
            description: "Download UAT and delivery documentation"
          }
        ]
      }
    ]
  }
];
