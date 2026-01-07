
import { 
  User, 
  Settings, 
  Key,
  Shield,
  LogOut,
  Users,
  Building2,
  LayoutGrid,
  FileText,
  Bell
} from "lucide-react";

export const userMenuItems = [
  {
    title: "User Profile & Permissions",
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
        description: "Manage system users and roles"
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
      }
    ]
  }
];