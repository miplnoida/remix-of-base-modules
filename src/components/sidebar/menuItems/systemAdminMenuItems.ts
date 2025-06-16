
import { 
  Settings, 
  Users, 
  Shield, 
  FileText
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
      }
    ]
  }
];
