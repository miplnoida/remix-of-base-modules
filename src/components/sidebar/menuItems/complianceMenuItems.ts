import {
  Shield,
  LayoutDashboard,
  FolderOpen,
  Calendar,
  MapPin,
  Bell,
  HandshakeIcon,
  FileText,
  TrendingUp,
  Settings,
  Scale,
  Users,
  ClipboardCheck,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Building2,
  Gavel,
  ShieldAlert,
  Cog,
  Timer,
  Search,
  Target,
  Zap,
  Hash,
  ListChecks,
  Eye,
  Briefcase,
  UserCheck
} from "lucide-react";

export const complianceMenuItems = [
  {
    title: "Compliance & Enforcement",
    icon: Shield,
    subItems: [
      // ── Dashboards ──
      {
        title: "Dashboards",
        icon: LayoutDashboard,
        requiresPermission: "manage_compliance",
        description: "Role-based compliance dashboards",
        subItems: [
          {
            title: "Manager Dashboard",
            url: "/compliance/dashboard/manager",
            icon: LayoutDashboard,
            requiresPermission: "manage_compliance",
            description: "Overview of all compliance metrics and KPIs"
          },
          {
            title: "Inspector Dashboard",
            url: "/compliance/dashboard/inspector",
            icon: UserCheck,
            requiresPermission: "manage_compliance",
            description: "Field inspector workload and assignments"
          },
          {
            title: "Legal Dashboard",
            url: "/compliance/dashboard/legal",
            icon: Gavel,
            requiresPermission: "manage_compliance",
            description: "Legal escalation pipeline and court tracking"
          }
        ]
      },

      // ── Violations Management ──
      {
        title: "Violations Management",
        icon: AlertTriangle,
        requiresPermission: "manage_compliance",
        description: "Manage compliance violations",
        subItems: [
          {
            title: "All Violations",
            url: "/compliance/violations",
            icon: FolderOpen,
            requiresPermission: "manage_compliance",
            description: "View and manage all compliance violations"
          },
          {
            title: "Manual Violation Entry",
            url: "/compliance/violations/manual-entry",
            icon: AlertTriangle,
            requiresPermission: "manage_compliance",
            description: "Create violations from field observations or scouting"
          }
        ]
      },

      // ── Compliance Cases ──
      {
        title: "Compliance Cases",
        icon: Briefcase,
        requiresPermission: "manage_compliance",
        description: "Case management with full lifecycle",
        subItems: [
          {
            title: "Case Management",
            url: "/compliance/cases",
            icon: Briefcase,
            requiresPermission: "manage_compliance",
            description: "View and manage all compliance cases"
          },
          {
            title: "Case Queue",
            url: "/compliance/cases/queue",
            icon: ListChecks,
            requiresPermission: "manage_compliance",
            description: "Prioritized queue of cases requiring action"
          }
        ]
      },

      // ── Employer Risk Profiles ──
      {
        title: "Employer Risk Profiles",
        url: "/compliance/risk-profiles",
        icon: Target,
        requiresPermission: "manage_compliance",
        description: "Risk scoring bands and employer risk assessment"
      },

      // ── Inspections ──
      {
        title: "Inspections",
        icon: Search,
        requiresPermission: "manage_compliance",
        description: "Field compliance inspections",
        subItems: [
          {
            title: "Inspection Management",
            url: "/compliance/inspections",
            icon: ClipboardCheck,
            requiresPermission: "manage_compliance",
            description: "Schedule and manage inspections"
          },
          {
            title: "Field Execution",
            url: "/compliance/inspections/field-execution",
            icon: MapPin,
            requiresPermission: "conduct_inspections",
            description: "Check-in, execute visits, collect evidence"
          },
          {
            title: "Employer Findings",
            url: "/compliance/employers/findings",
            icon: FileText,
            requiresPermission: "manage_compliance",
            description: "View all findings for employers"
          }
        ]
      },

      // ── Weekly Audit Planning (existing) ──
      {
        title: "Weekly Audit Planning",
        icon: Calendar,
        requiresPermission: "manage_compliance",
        description: "Plan and execute weekly audits",
        subItems: [
          {
            title: "Plan Builder",
            url: "/compliance/audit-planning/weekly-plan-builder",
            icon: Calendar,
            requiresPermission: "create_weekly_plan",
            description: "Create and manage weekly audit plans"
          },
          {
            title: "My Plans",
            url: "/compliance/audit-planning/my-plans",
            icon: Calendar,
            requiresPermission: "manage_compliance",
            description: "View my weekly plans and status"
          },
          {
            title: "Review & Approve Plans",
            url: "/compliance/audit-planning/pending-review",
            icon: ClipboardCheck,
            requiresPermission: "approve_weekly_plan",
            description: "Review and approve submitted inspector plans"
          },
          {
            title: "Weekly Report Submission",
            url: "/compliance/violations/weekly-reports",
            icon: FileText,
            requiresPermission: "manage_compliance",
            description: "Submit weekly inspection reports"
          }
        ]
      },

      // ── Payment Arrangements ──
      {
        title: "Payment Arrangements",
        icon: HandshakeIcon,
        requiresPermission: "manage_compliance",
        description: "Installment arrangements and breach monitoring",
        subItems: [
          {
            title: "Arrangement Management",
            url: "/compliance/arrangements",
            icon: HandshakeIcon,
            requiresPermission: "manage_compliance",
            description: "View and manage payment arrangements"
          },
          {
            title: "Breach Monitoring",
            url: "/compliance/arrangements/breaches",
            icon: ShieldAlert,
            requiresPermission: "manage_compliance",
            description: "Automatic breach detection and tracking"
          }
        ]
      },

      // ── Legal Escalation ──
      {
        title: "Legal Escalation",
        icon: Scale,
        requiresPermission: "manage_compliance",
        description: "Legal workflow and enforcement",
        subItems: [
          {
            title: "Legal Queue",
            url: "/compliance/legal/queue",
            icon: Scale,
            requiresPermission: "manage_compliance",
            description: "Cases ready for legal escalation"
          },
          {
            title: "Legal Proceedings",
            url: "/compliance/legal/proceedings",
            icon: Gavel,
            requiresPermission: "manage_compliance",
            description: "Active legal cases and court tracking"
          },
          {
            title: "Notices Management",
            url: "/compliance/notices",
            icon: Bell,
            requiresPermission: "manage_compliance",
            description: "Send and track compliance notices"
          },
          {
            title: "Waivers & Overrides",
            url: "/compliance/waivers",
            icon: FileText,
            requiresPermission: "manage_compliance",
            description: "Waiver requests and approval workflow"
          }
        ]
      },

      // ── Employer Statements (existing) ──
      {
        title: "Employer Statements",
        url: "/compliance/employer-statements",
        icon: FileText,
        requiresPermission: "view_financial_data",
        description: "Generate as-of-date employer statements"
      },

      // ── Reports (keep existing structure) ──
      {
        title: "Reports",
        icon: TrendingUp,
        requiresPermission: "generate_reports",
        description: "Compliance analytics and performance reports",
        subItems: [
          {
            title: "Violations Reports",
            icon: FileText,
            requiresPermission: "generate_reports",
            description: "Violation analytics, trends, and status tracking",
            subItems: [
              { title: "Violations by Status", url: "/compliance/reports/violations-analytics", icon: FileText, requiresPermission: "generate_reports" },
              { title: "Violations by Type", url: "/compliance/reports/violations-analytics", icon: FileText, requiresPermission: "generate_reports" },
              { title: "Violation Resolution Time", url: "/compliance/reports/violations-analytics", icon: FileText, requiresPermission: "generate_reports" },
              { title: "Violations by Zone", url: "/compliance/reports/violations-analytics", icon: FileText, requiresPermission: "generate_reports" }
            ]
          },
          {
            title: "Inspector Performance",
            icon: Users,
            requiresPermission: "generate_reports",
            description: "Field activity, plan compliance, and productivity metrics",
            subItems: [
              { title: "Weekly Plan Compliance", url: "/compliance/reports/inspector-performance", icon: Users, requiresPermission: "generate_reports" },
              { title: "Field Activities Summary", url: "/compliance/reports/inspector-performance", icon: Users, requiresPermission: "generate_reports" },
              { title: "Check-In/Check-Out Audit", url: "/compliance/reports/inspector-performance", icon: Users, requiresPermission: "generate_reports" },
              { title: "Violations Handled by Inspector", url: "/compliance/reports/inspector-performance", icon: Users, requiresPermission: "generate_reports" }
            ]
          },
          {
            title: "C3 Compliance Reports",
            icon: ClipboardCheck,
            requiresPermission: "generate_reports",
            description: "C3 submission rates, timeliness, and employer compliance",
            subItems: [
              { title: "On-Time vs Late Submissions", url: "/compliance/reports/c3-compliance", icon: ClipboardCheck, requiresPermission: "generate_reports" },
              { title: "Missing C3 Submissions", url: "/compliance/reports/c3-compliance", icon: ClipboardCheck, requiresPermission: "generate_reports" },
              { title: "C3 Without Payment", url: "/compliance/reports/c3-compliance", icon: ClipboardCheck, requiresPermission: "generate_reports" },
              { title: "Compliance Rate by Zone", url: "/compliance/reports/c3-compliance", icon: ClipboardCheck, requiresPermission: "generate_reports" }
            ]
          },
          {
            title: "Arrears & Collections",
            icon: DollarSign,
            requiresPermission: "generate_reports",
            description: "Outstanding balances, payment trends, and recovery metrics",
            subItems: [
              { title: "Total Arrears by Zone", url: "/compliance/reports/arrears", icon: DollarSign, requiresPermission: "generate_reports" },
              { title: "Arrears Aging Analysis", url: "/compliance/reports/arrears", icon: DollarSign, requiresPermission: "generate_reports" },
              { title: "Collections Over Time", url: "/compliance/reports/arrears", icon: DollarSign, requiresPermission: "generate_reports" },
              { title: "Top 50 Arrears Employers", url: "/compliance/reports/arrears", icon: DollarSign, requiresPermission: "generate_reports" }
            ]
          },
          {
            title: "Audit & Inspection Reports",
            icon: BarChart3,
            requiresPermission: "generate_reports",
            description: "Audit findings, inspection results, and risk assessments",
            subItems: [
              { title: "Audit Completion Rate", url: "/compliance/reports/audit", icon: BarChart3, requiresPermission: "generate_reports" },
              { title: "Findings by Severity", url: "/compliance/reports/audit", icon: BarChart3, requiresPermission: "generate_reports" },
              { title: "Inspection Coverage by Zone", url: "/compliance/reports/audit", icon: BarChart3, requiresPermission: "generate_reports" },
              { title: "Risk-Based Audit Results", url: "/compliance/reports/audit", icon: BarChart3, requiresPermission: "generate_reports" }
            ]
          },
          {
            title: "Payment Arrangements",
            icon: HandshakeIcon,
            requiresPermission: "generate_reports",
            description: "Active arrangements, defaults, and compliance tracking",
            subItems: [
              { title: "Active Arrangements", url: "/compliance/reports/arrangements", icon: HandshakeIcon, requiresPermission: "generate_reports" },
              { title: "Defaulted Arrangements", url: "/compliance/reports/arrangements", icon: HandshakeIcon, requiresPermission: "generate_reports" },
              { title: "Arrangement Success Rate", url: "/compliance/reports/arrangements", icon: HandshakeIcon, requiresPermission: "generate_reports" },
              { title: "Installment Payment Trends", url: "/compliance/reports/arrangements", icon: HandshakeIcon, requiresPermission: "generate_reports" }
            ]
          },
          {
            title: "Legal Escalation",
            icon: Scale,
            requiresPermission: "generate_reports",
            description: "Cases escalated to legal, court proceedings, and outcomes",
            subItems: [
              { title: "Violations Escalated to Legal", url: "/compliance/reports/legal", icon: Scale, requiresPermission: "generate_reports" },
              { title: "Legal Stage Distribution", url: "/compliance/reports/legal", icon: Scale, requiresPermission: "generate_reports" },
              { title: "Court Proceedings Status", url: "/compliance/reports/legal", icon: Scale, requiresPermission: "generate_reports" },
              { title: "Judgements & Enforcement", url: "/compliance/reports/legal", icon: Scale, requiresPermission: "generate_reports" }
            ]
          },
          {
            title: "Trend Analysis",
            icon: TrendingUp,
            requiresPermission: "generate_reports",
            description: "Historical trends and predictive analytics",
            subItems: [
              { title: "Compliance Trends (12 months)", url: "/compliance/reports/trends", icon: TrendingUp, requiresPermission: "generate_reports" },
              { title: "Violation Creation Trends", url: "/compliance/reports/trends", icon: TrendingUp, requiresPermission: "generate_reports" },
              { title: "Resolution Rate Trends", url: "/compliance/reports/trends", icon: TrendingUp, requiresPermission: "generate_reports" },
              { title: "Financial Recovery Trends", url: "/compliance/reports/trends", icon: TrendingUp, requiresPermission: "generate_reports" }
            ]
          }
        ]
      },

      // ── Automation & Jobs ──
      {
        title: "Automation & Jobs",
        icon: Zap,
        requiresPermission: "manage_compliance",
        description: "Scheduled compliance automation jobs",
        subItems: [
          {
            title: "Job Configuration",
            url: "/compliance/automation/jobs",
            icon: Cog,
            requiresPermission: "manage_compliance",
            description: "Configure and manage automation jobs"
          },
          {
            title: "Job History",
            url: "/compliance/automation/history",
            icon: Timer,
            requiresPermission: "manage_compliance",
            description: "View job execution history and logs"
          }
        ]
      },

      // ── Settings ──
      {
        title: "Settings",
        icon: Settings,
        requiresPermission: "manage_compliance",
        subItems: [
          {
            title: "Rule Engine",
            url: "/compliance/settings/rule-engine",
            icon: Cog,
            requiresPermission: "manage_compliance",
            description: "Configure detection, calculation, and escalation rules"
          },
          {
            title: "Violation Types",
            url: "/compliance/settings/violation-types",
            icon: AlertTriangle,
            requiresPermission: "manage_compliance",
            description: "Configure violation type definitions"
          },
          {
            title: "Reference Numbering",
            url: "/compliance/settings/number-templates",
            icon: Hash,
            requiresPermission: "manage_compliance",
            description: "Configure auto-numbering schemes for violations, cases, and notices"
          },
          {
            title: "Risk & Escalation Policy",
            url: "/compliance/settings/risk-policy",
            icon: TrendingUp,
            requiresPermission: "manage_compliance",
            description: "Risk factors, weights, bands, policies, and legal escalation thresholds"
          },
          {
            title: "Templates",
            url: "/compliance/settings/templates",
            icon: FileText,
            requiresPermission: "manage_compliance",
            description: "Manage compliance notification templates"
          }
        ]
      }
    ]
  }
];
