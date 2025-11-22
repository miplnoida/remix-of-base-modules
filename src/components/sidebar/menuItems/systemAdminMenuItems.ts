import { 
  Settings, 
  Users, 
  Shield, 
  FileText,
  Globe,
  History,
  DollarSign,
  Activity,
  UserCog,
  Key,
  Clock,
  Building2,
  Briefcase,
  ShieldCheck,
  GitBranch,
  Grid3x3,
  Workflow,
  Bell,
  Link2,
  ClipboardCheck
} from "lucide-react";

export const systemAdminMenuItems = [
  {
    title: "System Administration",
    icon: Settings,
    subItems: [
      {
        title: "User Management",
        url: "/admin/users",
        icon: Users,
        requiresPermission: "system_administration"
      },
      {
        title: "Employee Management",
        url: "/admin/employees",
        icon: UserCog,
        requiresPermission: "system_administration"
      },
      {
        title: "Web Users",
        url: "/admin/web-users",
        icon: Globe,
        requiresPermission: "system_administration"
      },
      {
        title: "Organisation Structure",
        icon: Building2,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Org Units",
            url: "/admin/org-units",
            icon: Building2,
            requiresPermission: "system_administration"
          },
          {
            title: "Positions",
            url: "/admin/positions",
            icon: Briefcase,
            requiresPermission: "system_administration"
          }
        ]
      },
      {
        title: "Roles & Permissions",
        url: "/admin/roles",
        icon: ShieldCheck,
        requiresPermission: "system_administration"
      },
      {
        title: "Delegations",
        url: "/admin/delegations",
        icon: GitBranch,
        requiresPermission: "system_administration"
      },
      {
        title: "Approval Matrix",
        icon: Grid3x3,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Payment Approvals",
            url: "/admin/approval-matrix/payment",
            icon: DollarSign,
            requiresPermission: "system_administration"
          },
          {
            title: "Fee Waiver Approvals",
            url: "/admin/approval-matrix/fee-waiver",
            icon: FileText,
            requiresPermission: "system_administration"
          },
          {
            title: "Journal Entry Approvals",
            url: "/admin/approval-matrix/journal",
            icon: FileText,
            requiresPermission: "system_administration"
          },
          {
            title: "Refund Approvals",
            url: "/admin/approval-matrix/refund",
            icon: DollarSign,
            requiresPermission: "system_administration"
          },
          {
            title: "Write-Off Approvals",
            url: "/admin/approval-matrix/write-off",
            icon: FileText,
            requiresPermission: "system_administration"
          }
        ]
      },
      {
        title: "Workflow Configuration",
        url: "/admin/workflow-schemes",
        icon: Workflow,
        requiresPermission: "system_administration"
      },
      {
        title: "Notifications",
        icon: Bell,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Notification Log",
            url: "/admin/notifications/log",
            icon: History,
            requiresPermission: "system_administration"
          },
          {
            title: "Templates",
            url: "/admin/notifications/templates",
            icon: FileText,
            requiresPermission: "system_administration"
          },
          {
            title: "Channel Settings",
            url: "/admin/notifications/channels",
            icon: Settings,
            requiresPermission: "system_administration"
          }
        ]
      },
      {
        title: "Security Settings",
        url: "/admin/security",
        icon: Shield,
        requiresPermission: "system_administration"
      },
      {
        title: "System Settings",
        url: "/admin/settings",
        icon: Settings,
        requiresPermission: "system_administration"
      },
      {
        title: "Backup & Recovery",
        url: "/admin/backup",
        icon: Shield,
        requiresPermission: "system_administration"
      },
      {
        title: "System Logs",
        url: "/admin/logs",
        icon: FileText,
        requiresPermission: "system_administration"
      },
      {
        title: "Audit Log",
        url: "/admin/audit-log",
        icon: History,
        requiresPermission: "system_administration"
      },
      {
        title: "Central Scheduler",
        url: "/admin/scheduler",
        icon: Clock,
        requiresPermission: "system_administration"
      },
      {
        title: "Reports",
        icon: FileText,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Account & Roles",
            url: "/reports/admin/account-roles",
            icon: UserCog,
            requiresPermission: "system_administration"
          },
          {
            title: "Permission Changes",
            url: "/reports/admin/permission-changes",
            icon: Key,
            requiresPermission: "system_administration"
          },
          {
            title: "Configuration Audit",
            url: "/reports/admin/configuration-audit",
            icon: Activity,
            requiresPermission: "system_administration"
          }
        ]
      }
    ]
  }
];
