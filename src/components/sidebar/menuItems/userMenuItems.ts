
import { 
  User, 
  Settings, 
  Key,
  Shield,
  LogOut
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
      },
      {
        title: "Manage Roles",
        url: "/admin/roles",
        icon: Shield,
        requiresPermission: "manage_users",
        description: "Manage user roles and permissions (Admin only)"
      },
      {
        title: "System Settings",
        url: "/admin/settings",
        icon: Settings,
        requiresPermission: "system_admin",
        description: "System configuration and settings"
      }
    ]
  }
];
