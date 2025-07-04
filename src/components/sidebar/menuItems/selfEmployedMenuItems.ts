
import { 
  User, 
  UserPlus, 
  UserCheck, 
  Search,
  DollarSign,
  TrendingUp,
  FileText
} from "lucide-react";

export const selfEmployedMenuItems = [
  {
    title: "Self Employed Management",
    icon: User,
    subItems: [
      {
        title: "Register Self Employed",
        url: "/self-employed/register",
        icon: UserPlus,
        requiresPermission: "manage_self_employed"
      },
      {
        title: "Self Employed Approval",
        url: "/self-employed/approval",
        icon: UserCheck,
        requiresPermission: "manage_self_employed"
      },
      {
        title: "Self Employed Directory",
        url: "/self-employed/directory",
        icon: Search,
        requiresPermission: "manage_self_employed"
      },
      {
        title: "Contribution Entry",
        url: "/self-employed/contribution-entry",
        icon: DollarSign,
        requiresPermission: "manage_self_employed"
      },
      {
        title: "Contribution Tracking",
        url: "/self-employed/contributions",
        icon: TrendingUp,
        requiresPermission: "view_financial_data"
      },
      {
        title: "Self Employed Reports",
        url: "/self-employed/reports",
        icon: FileText,
        requiresPermission: "generate_reports"
      }
    ]
  }
];
