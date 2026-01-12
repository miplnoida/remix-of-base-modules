
import { 
  Users, 
  List,
  BarChart3,
  UserCog,
  FileText,
  TrendingUp,
  Calendar,
  ClipboardList,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  UserX,
  Mail,
  Clock,
  FileWarning,
  Scan,
  Upload,
  Activity,
  DollarSign,
  UsersRound,
  ListChecks,
  LineChart,
  Building2,
  Settings
} from "lucide-react";

export const insuredPersonsMenuItems = [
  {
    title: "Insured Persons",
    icon: Users,
    subItems: [
      {
        title: "Dashboard",
        url: "/person/management",
        icon: BarChart3,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "IP Management",
        url: "/person/ip-management", 
        icon: UserCog,
        requiresPermission: "manage_insured_persons",
        subItems: [
          {
            title: "IP Registration",
            url: "/ip-registration",
            icon: PlusCircle,
            requiresPermission: "manage_insured_persons"
          },
          {
            title: "Pending Reviews",
            url: "/person/pending-reviews",
            icon: List,
            requiresPermission: "manage_insured_persons"
          },
          {
            title: "Insured Person Listing",
            url: "/person/ip-management",
            icon: List,
            requiresPermission: "manage_insured_persons"
          }
        ]
      },
      {
        title: "Service Requests",
        icon: ClipboardList,
        requiresPermission: "manage_insured_persons",
        subItems: [
          {
            title: "New Request",
            url: "/person/service-requests/new",
            icon: PlusCircle,
            requiresPermission: "manage_insured_persons"
          },
          {
            title: "Request Listing",
            url: "/person/service-requests",
            icon: List,
            requiresPermission: "manage_insured_persons"
          },
          {
            title: "Pending Verification",
            url: "/person/service-requests/pending-verification",
            icon: FileText,
            requiresPermission: "manage_insured_persons"
          }
        ]
      },
      {
        title: "Reports",
        icon: FileText,
        requiresPermission: "view_reports",
        subItems: [
          {
            title: "IP Entry & Verification",
            url: "/person/reports/ip-entry-verification",
            icon: CheckCircle2,
            requiresPermission: "view_reports"
          },
          {
            title: "Online Renewal/Update",
            url: "/person/reports/online-renewal-update",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Registration Payments",
            url: "/person/reports/registration-payments",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Contribution Statement Payment",
            url: "/person/reports/contribution-statement-payment",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Pension Letters Payment",
            url: "/person/reports/pension-letters-payment",
            icon: Mail,
            requiresPermission: "view_reports"
          },
          {
            title: "Non-National Workers SSN",
            url: "/person/reports/non-national-workers-ssn",
            icon: UserX,
            requiresPermission: "view_reports"
          },
          {
            title: "New Registrants by Officer",
            url: "/person/reports/new-registrants-by-officer",
            icon: Users,
            requiresPermission: "view_reports"
          },
          {
            title: "Employer Registration by Officer",
            url: "/person/reports/employer-registration-by-officer",
            icon: Building2,
            requiresPermission: "view_reports"
          },
          {
            title: "Life Certificates",
            url: "/person/reports/life-certificates",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Self-Employed by Officer",
            url: "/person/reports/self-employed-by-officer",
            icon: Users,
            requiresPermission: "view_reports"
          },
          {
            title: "Claims Entered by Officer",
            url: "/person/reports/claims-entered-by-officer",
            icon: ClipboardList,
            requiresPermission: "view_reports"
          },
          {
            title: "Self-Employed Without License",
            url: "/person/reports/self-employed-without-license",
            icon: AlertCircle,
            requiresPermission: "view_reports"
          },
          {
            title: "Claims to Benefits Dept",
            url: "/person/reports/claims-to-benefits",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "CRM Activity",
            url: "/person/reports/crm-activity",
            icon: Activity,
            requiresPermission: "view_reports"
          },
          {
            title: "Refunds to CRU/Finance",
            url: "/person/reports/refunds-to-cru",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "Printed & Spoiled Cards",
            url: "/person/reports/printed-spoiled-cards",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Internal Audit Sample",
            url: "/person/reports/audit-sample-ip",
            icon: ListChecks,
            requiresPermission: "view_reports"
          }
        ]
      },
      {
        title: "Settings",
        icon: Settings,
        requiresPermission: "manage_settings",
        subItems: [
          {
            title: "Templates",
            url: "/insured-persons/templates",
            icon: FileText,
            requiresPermission: "manage_templates"
          }
        ]
      }
    ]
  }
];
