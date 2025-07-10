
import { 
  Building2, 
  Search,
  Plus,
  FileText,
  Users,
  BarChart3
} from "lucide-react";

export const employersManagementMenuItems = [
  {
    title: "Employers Management",
    icon: Building2,
    subItems: [
      {
        title: "Dashboard",
        url: "/employers-management/dashboard",
        icon: BarChart3,
        requiresPermission: "view_dashboard",
        description: "View employer statistics and quick links"
      },
      {
        title: "Manage Employers",
        url: "/employers-management/manage",
        icon: Users,
        requiresPermission: "manage_employers",
        description: "Search, filter, and manage employer listings"
      },
      {
        title: "Add New Employer",
        url: "/employers-management/add",
        icon: Plus,
        requiresPermission: "manage_employers",
        description: "Register new employer with complete details"
      },
      {
        title: "Employers Reports",
        url: "/employers-management/reports",
        icon: FileText,
        requiresPermission: "generate_reports",
        description: "Generate employer reports and exports"
      }
    ]
  }
];
