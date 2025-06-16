
import { 
  BarChart3, 
  FileText, 
  DollarSign, 
  Building2, 
  FileSpreadsheet, 
  Users, 
  TrendingUp
} from "lucide-react";

export const reportsMenuItems = [
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    subItems: [
      {
        title: "Claims Reports",
        url: "/reports/claims",
        icon: FileText,
        requiresPermission: "reports_analytics"
      },
      {
        title: "Cashier Reports",
        url: "/reports/cashier",
        icon: DollarSign,
        requiresPermission: "view_financial_data"
      },
      {
        title: "Employer Reports",
        url: "/reports/employer",
        icon: Building2,
        requiresPermission: "reports_analytics"
      },
      {
        title: "Employer Statement",
        url: "/reports/employer-statement",
        icon: FileSpreadsheet,
        requiresPermission: "reports_analytics"
      },
      {
        title: "Persons Reports",
        url: "/reports/persons",
        icon: Users,
        requiresPermission: "reports_analytics"
      },
      {
        title: "Statistics Reports",
        url: "/reports/statistics",
        icon: TrendingUp,
        requiresPermission: "reports_analytics"
      },
      {
        title: "Financial Reports",
        url: "/reports/financial",
        icon: DollarSign,
        requiresPermission: "view_financial_data"
      },
      {
        title: "Custom Reports",
        url: "/reports/custom",
        icon: FileText,
        requiresPermission: "reports_analytics"
      }
    ]
  }
];
