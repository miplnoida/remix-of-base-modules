
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
  AlertTriangle
} from "lucide-react";

export const complianceMenuItems = [
  {
    title: "Compliance & Audit",
    icon: Shield,
    subItems: [
      {
        title: "Compliance Dashboard",
        url: "/compliance/dashboard",
        icon: LayoutDashboard,
        requiresPermission: "manage_compliance",
        description: "Visual overview of compliance metrics and trends"
      },
      {
        title: "Case Management",
        url: "/compliance/cases",
        icon: FolderOpen,
        requiresPermission: "manage_compliance",
        description: "View and manage all compliance cases"
      },
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
            title: "Field Execution",
            url: "/compliance/audit-planning/field-execution",
            icon: MapPin,
            requiresPermission: "conduct_inspections",
            description: "Check-in, execute visits, collect evidence"
          },
          {
            title: "Weekly Reports",
            url: "/compliance/audit-planning/weekly-reports",
            icon: FileText,
            requiresPermission: "manage_compliance",
            description: "Submit and review weekly reports"
          }
        ]
      },
      {
        title: "Notices & Communication",
        url: "/compliance/notices",
        icon: Bell,
        requiresPermission: "manage_compliance",
        description: "Send and track compliance notices"
      },
      {
        title: "Payment Arrangements",
        url: "/compliance/arrangements",
        icon: HandshakeIcon,
        requiresPermission: "manage_compliance",
        description: "Manage payment arrangements and installments"
      },
      {
        title: "Employer Statements",
        url: "/compliance/employer-statements",
        icon: FileText,
        requiresPermission: "view_financial_data",
        description: "Generate as-of-date employer statements"
      },
      {
        title: "Reports",
        icon: TrendingUp,
        requiresPermission: "generate_reports",
        description: "Compliance analytics and performance reports",
        subItems: [
          {
            title: "Case Management Reports",
            icon: FileText,
            requiresPermission: "generate_reports",
            description: "Case analytics, trends, and status tracking",
            subItems: [
              {
                title: "Cases by Status",
                url: "/compliance/reports/case-analytics",
                icon: FileText,
                requiresPermission: "generate_reports"
              },
              {
                title: "Cases by Type",
                url: "/compliance/reports/case-analytics",
                icon: FileText,
                requiresPermission: "generate_reports"
              },
              {
                title: "Case Resolution Time",
                url: "/compliance/reports/case-analytics",
                icon: FileText,
                requiresPermission: "generate_reports"
              },
              {
                title: "Cases by Zone",
                url: "/compliance/reports/case-analytics",
                icon: FileText,
                requiresPermission: "generate_reports"
              }
            ]
          },
          {
            title: "Inspector Performance",
            icon: Users,
            requiresPermission: "generate_reports",
            description: "Field activity, plan compliance, and productivity metrics",
            subItems: [
              {
                title: "Weekly Plan Compliance",
                url: "/compliance/reports/inspector-performance",
                icon: Users,
                requiresPermission: "generate_reports"
              },
              {
                title: "Field Activities Summary",
                url: "/compliance/reports/inspector-performance",
                icon: Users,
                requiresPermission: "generate_reports"
              },
              {
                title: "Check-In/Check-Out Audit",
                url: "/compliance/reports/inspector-performance",
                icon: Users,
                requiresPermission: "generate_reports"
              },
              {
                title: "Cases Handled by Inspector",
                url: "/compliance/reports/inspector-performance",
                icon: Users,
                requiresPermission: "generate_reports"
              }
            ]
          },
          {
            title: "C3 Compliance Reports",
            icon: ClipboardCheck,
            requiresPermission: "generate_reports",
            description: "C3 submission rates, timeliness, and employer compliance",
            subItems: [
              {
                title: "On-Time vs Late Submissions",
                url: "/compliance/reports/c3-compliance",
                icon: ClipboardCheck,
                requiresPermission: "generate_reports"
              },
              {
                title: "Missing C3 Submissions",
                url: "/compliance/reports/c3-compliance",
                icon: ClipboardCheck,
                requiresPermission: "generate_reports"
              },
              {
                title: "C3 Without Payment",
                url: "/compliance/reports/c3-compliance",
                icon: ClipboardCheck,
                requiresPermission: "generate_reports"
              },
              {
                title: "Compliance Rate by Zone",
                url: "/compliance/reports/c3-compliance",
                icon: ClipboardCheck,
                requiresPermission: "generate_reports"
              }
            ]
          },
          {
            title: "Arrears & Collections",
            icon: DollarSign,
            requiresPermission: "generate_reports",
            description: "Outstanding balances, payment trends, and recovery metrics",
            subItems: [
              {
                title: "Total Arrears by Zone",
                url: "/compliance/reports/arrears",
                icon: DollarSign,
                requiresPermission: "generate_reports"
              },
              {
                title: "Arrears Aging Analysis",
                url: "/compliance/reports/arrears",
                icon: DollarSign,
                requiresPermission: "generate_reports"
              },
              {
                title: "Collections Over Time",
                url: "/compliance/reports/arrears",
                icon: DollarSign,
                requiresPermission: "generate_reports"
              },
              {
                title: "Top 50 Arrears Employers",
                url: "/compliance/reports/arrears",
                icon: DollarSign,
                requiresPermission: "generate_reports"
              }
            ]
          },
          {
            title: "Audit & Inspection Reports",
            icon: BarChart3,
            requiresPermission: "generate_reports",
            description: "Audit findings, inspection results, and risk assessments",
            subItems: [
              {
                title: "Audit Completion Rate",
                url: "/compliance/reports/audit",
                icon: BarChart3,
                requiresPermission: "generate_reports"
              },
              {
                title: "Findings by Severity",
                url: "/compliance/reports/audit",
                icon: BarChart3,
                requiresPermission: "generate_reports"
              },
              {
                title: "Inspection Coverage by Zone",
                url: "/compliance/reports/audit",
                icon: BarChart3,
                requiresPermission: "generate_reports"
              },
              {
                title: "Risk-Based Audit Results",
                url: "/compliance/reports/audit",
                icon: BarChart3,
                requiresPermission: "generate_reports"
              }
            ]
          },
          {
            title: "Payment Arrangements",
            icon: HandshakeIcon,
            requiresPermission: "generate_reports",
            description: "Active arrangements, defaults, and compliance tracking",
            subItems: [
              {
                title: "Active Arrangements",
                url: "/compliance/reports/arrangements",
                icon: HandshakeIcon,
                requiresPermission: "generate_reports"
              },
              {
                title: "Defaulted Arrangements",
                url: "/compliance/reports/arrangements",
                icon: HandshakeIcon,
                requiresPermission: "generate_reports"
              },
              {
                title: "Arrangement Success Rate",
                url: "/compliance/reports/arrangements",
                icon: HandshakeIcon,
                requiresPermission: "generate_reports"
              },
              {
                title: "Installment Payment Trends",
                url: "/compliance/reports/arrangements",
                icon: HandshakeIcon,
                requiresPermission: "generate_reports"
              }
            ]
          },
          {
            title: "Legal Escalation",
            icon: Scale,
            requiresPermission: "generate_reports",
            description: "Cases escalated to legal, court proceedings, and outcomes",
            subItems: [
              {
                title: "Cases Escalated to Legal",
                url: "/compliance/reports/legal",
                icon: Scale,
                requiresPermission: "generate_reports"
              },
              {
                title: "Legal Stage Distribution",
                url: "/compliance/reports/legal",
                icon: Scale,
                requiresPermission: "generate_reports"
              },
              {
                title: "Court Proceedings Status",
                url: "/compliance/reports/legal",
                icon: Scale,
                requiresPermission: "generate_reports"
              },
              {
                title: "Judgements & Enforcement",
                url: "/compliance/reports/legal",
                icon: Scale,
                requiresPermission: "generate_reports"
              }
            ]
          },
          {
            title: "Trend Analysis",
            icon: TrendingUp,
            requiresPermission: "generate_reports",
            description: "Historical trends and predictive analytics",
            subItems: [
              {
                title: "Compliance Trends (12 months)",
                url: "/compliance/reports/trends",
                icon: TrendingUp,
                requiresPermission: "generate_reports"
              },
              {
                title: "Case Creation Trends",
                url: "/compliance/reports/trends",
                icon: TrendingUp,
                requiresPermission: "generate_reports"
              },
              {
                title: "Resolution Rate Trends",
                url: "/compliance/reports/trends",
                icon: TrendingUp,
                requiresPermission: "generate_reports"
              },
              {
                title: "Financial Recovery Trends",
                url: "/compliance/reports/trends",
                icon: TrendingUp,
                requiresPermission: "generate_reports"
              }
            ]
          }
        ]
      },
      {
        title: "Audit Planning",
        url: "/compliance/audit-planning/sampling-dashboard",
        icon: Calendar,
        requiresPermission: "manage_compliance",
        description: "Risk & sampling dashboard, monthly candidates"
      },
      {
        title: "Legal Recommendation Queue",
        url: "/compliance/legal-recommendation-queue",
        icon: Scale,
        requiresPermission: "manage_compliance",
        description: "Review cases ready for legal escalation"
      },
      {
        title: "Settings",
        icon: Settings,
        requiresPermission: "manage_compliance",
        subItems: [
          {
            title: "Compliance Settings",
            url: "/compliance/settings",
            icon: Settings,
            requiresPermission: "manage_compliance",
            description: "Configure C3 grace periods, penalties, and automatic case rules"
          },
          {
            title: "Legal Escalation Policy",
            url: "/compliance/legal-escalation-policy",
            icon: Shield,
            requiresPermission: "manage_compliance",
            description: "Configure legal escalation rules and thresholds"
          },
          {
            title: "Risk Rule Policy",
            url: "/compliance/settings/risk-policy",
            icon: TrendingUp,
            requiresPermission: "manage_compliance",
            description: "Configure risk factors, policies, and risk bands"
          },
          {
            title: "Templates",
            url: "/compliance/templates",
            icon: FileText,
            requiresPermission: "manage_compliance",
            description: "Manage compliance notification templates"
          }
        ]
      }
    ]
  }
];
