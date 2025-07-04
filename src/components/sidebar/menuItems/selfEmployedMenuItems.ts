
import { 
  User, 
  Users, 
  Plus, 
  FileText
} from "lucide-react";

export const selfEmployedMenuItems = [
  {
    title: "Self-Employed Management",
    icon: User,
    subItems: [
      {
        title: "Manage Self-Employed",
        url: "/self-employed/manage",
        icon: Users,
        requiresPermission: "manage_self_employed",
        description: "Search, filter, and manage self-employed listings"
      },
      {
        title: "Add New Self-Employed",
        url: "/self-employed/add",
        icon: Plus,
        requiresPermission: "manage_self_employed",
        description: "Register new self-employed individual"
      },
      {
        title: "Self-Employed Reports",
        url: "/self-employed/reports",
        icon: FileText,
        requiresPermission: "generate_reports",
        description: "Generate self-employed reports and exports"
      }
    ]
  }
];
