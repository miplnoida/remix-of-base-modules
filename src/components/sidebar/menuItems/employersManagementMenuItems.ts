
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
