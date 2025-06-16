
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Heart, 
  Shield, 
  FileText, 
  UserCheck, 
  CheckSquare,
  DollarSign,
  Search,
  TrendingUp,
  FileSpreadsheet,
  Gavel,
  Clipboard,
  AlertTriangle,
  CreditCard,
  IdCard
} from "lucide-react";

export const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Employer Management",
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
        title: "Compliance Monitoring",
        url: "/employer/compliance",
        icon: Shield,
        requiresPermission: "manage_compliance"
      }
    ]
  },
  {
    title: "Insured Persons",
    icon: Users,
    subItems: [
      {
        title: "Register Person",
        url: "/person/register",
        icon: UserCheck,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "Person Approval",
        url: "/person/approval",
        icon: CheckSquare,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "Person Directory",
        url: "/person/directory",
        icon: Search,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "ID Card Generation",
        url: "/person/id-cards",
        icon: IdCard,
        requiresPermission: "manage_insured_persons"
      }
    ]
  },
  {
    title: "Benefits",
    icon: Heart,
    subItems: [
      {
        title: "All Benefits",
        url: "/benefits/all",
        icon: Heart,
        requiresPermission: "process_claims"
      },
      {
        title: "Maternity Benefits",
        url: "/benefits/maternity",
        icon: Heart,
        requiresPermission: "process_claims"
      },
      {
        title: "Unemployment Benefits",
        url: "/benefits/unemployment",
        icon: Users,
        requiresPermission: "process_claims"
      },
      {
        title: "Work Injury Benefits",
        url: "/benefits/work-injury",
        icon: Shield,
        requiresPermission: "process_claims"
      },
      {
        title: "Death Benefits",
        url: "/benefits/death",
        icon: Heart,
        requiresPermission: "process_claims"
      },
      {
        title: "Educational Benefits",
        url: "/benefits/educational",
        icon: FileText,
        requiresPermission: "process_claims"
      }
    ]
  },
  {
    title: "Compliance & Audit",
    icon: Shield,
    subItems: [
      {
        title: "Compliance Dashboard",
        url: "/compliance/dashboard",
        icon: LayoutDashboard,
        requiresPermission: "manage_compliance"
      },
      {
        title: "Employer Compliance",
        url: "/compliance/employer",
        icon: Building2,
        requiresPermission: "manage_compliance"
      },
      {
        title: "Compliance Reports",
        url: "/compliance/reports",
        icon: FileText,
        requiresPermission: "generate_reports"
      },
      {
        title: "Legal Proceedings",
        url: "/compliance/legal",
        icon: Gavel,
        requiresPermission: "manage_legal_proceedings"
      },
      {
        title: "Audit Management",
        url: "/compliance/audits",
        icon: Clipboard,
        requiresPermission: "conduct_inspections"
      },
      {
        title: "Penalty Management",
        url: "/compliance/penalties",
        icon: AlertTriangle,
        requiresPermission: "manage_compliance"
      }
    ]
  },
  {
    title: "Reports",
    icon: FileText,
    subItems: [
      {
        title: "Claims Reports",
        url: "/reports/claims",
        icon: FileText,
        requiresPermission: "generate_reports"
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
        requiresPermission: "generate_reports"
      },
      {
        title: "Employer Statement",
        url: "/reports/employer-statement",
        icon: FileSpreadsheet,
        requiresPermission: "generate_reports"
      },
      {
        title: "Persons Reports",
        url: "/reports/persons",
        icon: Users,
        requiresPermission: "generate_reports"
      },
      {
        title: "Statistics Reports",
        url: "/reports/statistics",
        icon: TrendingUp,
        requiresPermission: "generate_reports"
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
        requiresPermission: "generate_reports"
      }
    ]
  }
];
