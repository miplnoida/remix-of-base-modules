import { 
  Building2, 
  BarChart3,
  Users,
  FileText
} from "lucide-react";

export const c3MenuItems = [
  {
    title: "C3 Management",
    icon: Building2,
    subItems: [
      {
        title: "Dashboard",
        url: "/c3-management/dashboard",
        icon: BarChart3,
        requiresPermission: "view_dashboard",
        description: "View C3 statistics and overview"
      },
      {
        title: "Manage C3",
        url: "/c3-management/manage",
        icon: Users,
        requiresPermission: "manage_c3",
        description: "Add and manage C3 contribution records"
      }
    ]
  }
];