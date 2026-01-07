
import { 
  User, 
  Settings, 
  Key,
  Shield,
  Users,
  Building2,
  LayoutGrid,
  FileText,
  Bell,
  Monitor,
  Mail
} from "lucide-react";

export const userMenuItems = [
  {
    title: "User Profile & Preferences",
    icon: User,
    subItems: [
      {
        title: "My Profile",
        url: "/profile",
        icon: User,
        description: "View and edit personal profile information"
      },
      {
        title: "Change Password",
        url: "/profile/change-password",
        icon: Key,
        description: "Update account password"
      },
      {
        title: "Notification Preferences",
        url: "/profile/notifications",
        icon: Bell,
        description: "Manage your notification settings"
      },
      {
        title: "Active Sessions",
        url: "/profile/sessions",
        icon: Monitor,
        description: "View and manage login sessions"
      },
      {
        title: "Notification Center",
        url: "/notifications/center",
        icon: Mail,
        description: "View all your notifications"
      }
    ]
  },
  {
    title: "Administration",
    icon: Settings,
    subItems: [
      {
        title: "User Management",
        url: "/admin/users",
        icon: Users,
        requiresPermission: "manage_users",
        description: "Manage system users"
      },
      {
        title: "Role Management",
        url: "/admin/roles",
        icon: Shield,
        requiresPermission: "manage_users",
        description: "Manage roles and MFA settings"
      },
      {
        title: "Role Permissions",
        url: "/admin/roles-permissions",
        icon: Shield,
        requiresPermission: "manage_users",
        description: "Configure role-based permissions"
      },
      {
        title: "Office Locations",
        url: "/admin/offices",
        icon: Building2,
        requiresPermission: "manage_users",
        description: "Manage offices and departments"
      },
      {
        title: "Module Management",
        url: "/admin/modules",
        icon: LayoutGrid,
        requiresPermission: "system_admin",
        description: "Configure application modules"
      },
      {
        title: "Password Policy",
        url: "/admin/security/password-policy",
        icon: Key,
        requiresPermission: "system_admin",
        description: "Configure password requirements"
      },
      {
        title: "MFA Settings",
        url: "/admin/security/mfa",
        icon: Shield,
        requiresPermission: "system_admin",
        description: "Configure multi-factor authentication"
      },
      {
        title: "Audit Logs",
        url: "/admin/audit-logs",
        icon: FileText,
        requiresPermission: "system_admin",
        description: "View system audit trail"
      },
      {
        title: "Notifications",
        url: "/admin/notifications",
        icon: Bell,
        requiresPermission: "manage_users",
        description: "Manage notification templates and logs"
      },
      {
        title: "Notification Providers",
        url: "/admin/notifications/providers",
        icon: Mail,
        requiresPermission: "system_admin",
        description: "Configure notification providers"
      }
    ]
  }
];