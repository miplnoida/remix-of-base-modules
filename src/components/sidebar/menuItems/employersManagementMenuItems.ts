
import { 
  Building2, 
  Search,
  Plus,
  FileText,
  Users
} from "lucide-react";

export const employersManagementMenuItems = [
  {
    title: "Employers Management",
    icon: Building2,
    subItems: [
      {
        title: "Dashboard",
        url: "/employers-management/dashboard",
        icon: Search,
        requiresPermission: "view_employers",
        description: "View employer statistics and quick actions"
      },
      {
        title: "Manage Employers",
        url: "/employers-management/manage",
        icon: Users,
        requiresPermission: "manage_employers",
        description: "Manage employers by status with search and filters"
      }
    ]
  }
];
