
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
  Key
} from "lucide-react";

export const systemAdminMenuItems = [
  {
    title: "System Administration",
    icon: Settings,
    subItems: [
      {
        title: "Fee Configuration",
        url: "/admin/fee-configuration",
        icon: DollarSign,
        requiresPermission: "system_administration"
      },
      {
        title: "User Management",
        url: "/admin/users",
        icon: Users,
        requiresPermission: "system_administration"
      },
      {
        title: "Web Users",
        url: "/admin/web-users",
        icon: Globe,
        requiresPermission: "system_administration"
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
