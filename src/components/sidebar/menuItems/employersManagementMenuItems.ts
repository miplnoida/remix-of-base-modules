
import { 
  Building2, 
  UserCheck, 
  CheckSquare,
  DollarSign,
  Search,
  TrendingUp,
  FileText
} from "lucide-react";

export const employersManagementMenuItems = [
  {
    title: "Employers Management",
    icon: Building2,
    subItems: [
      {
        title: "Register Employer",
        url: "/employer/register",
        icon: UserCheck,
        requiresPermission: "manage_employers"
      },
      {
        title: "Employer Approval",
        url: "/employer/approval",
        icon: CheckSquare,
        requiresPermission: "manage_employers"
      },
      {
        title: "Employer Directory",
        url: "/employer/directory",
        icon: Search,
        requiresPermission: "manage_employers"
      },
      {
        title: "Contribution Entry",
        url: "/employer/contribution-entry",
        icon: DollarSign,
        requiresPermission: "manage_employers"
      },
      {
        title: "Contribution Tracking",
        url: "/employer/contributions",
        icon: TrendingUp,
        requiresPermission: "view_financial_data"
      },
      {
        title: "Employer Reports",
        url: "/employer/reports",
        icon: FileText,
        requiresPermission: "generate_reports"
      }
    ]
  }
];
