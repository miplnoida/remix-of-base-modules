
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
  LineChart
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
            title: "C3 Entry & Verification",
            url: "/person/reports/c3-entry-verification",
            icon: FileText,
            requiresPermission: "view_reports"
          },
          {
            title: "Pending C3 Schedules",
            url: "/person/reports/pending-c3",
            icon: Clock,
            requiresPermission: "view_reports"
          },
          {
            title: "Age 62+ Without Claim",
            url: "/person/reports/age-62-without-claim",
            icon: UserX,
            requiresPermission: "view_reports"
          },
          {
            title: "Employer Notification Letters",
            url: "/person/reports/employer-notifications",
            icon: Mail,
            requiresPermission: "view_reports"
          },
          {
            title: "Outstanding Discrepancies",
            url: "/person/reports/outstanding-discrepancies",
            icon: AlertCircle,
            requiresPermission: "view_reports"
          },
          {
            title: "C3s Missing SSN",
            url: "/person/reports/missing-ssn",
            icon: FileWarning,
            requiresPermission: "view_reports"
          },
          {
            title: "Scanning Activity",
            url: "/person/reports/scanning-activity",
            icon: Scan,
            requiresPermission: "view_reports"
          },
          {
            title: "Electronic C3 Uploads",
            url: "/person/reports/electronic-c3-uploads",
            icon: Upload,
            requiresPermission: "view_reports"
          },
          {
            title: "Long-Term Claims",
            url: "/person/reports/long-term-claims",
            icon: Activity,
            requiresPermission: "view_reports"
          },
          {
            title: "C3s Without Payment",
            url: "/person/reports/c3-without-payment",
            icon: DollarSign,
            requiresPermission: "view_reports"
          },
          {
            title: "High-Wage Multi-Employer",
            url: "/person/reports/high-wage-multi-employer",
            icon: UsersRound,
            requiresPermission: "view_reports"
          },
          {
            title: "Internal Audit Sample",
            url: "/person/reports/audit-sample",
            icon: ListChecks,
            requiresPermission: "view_reports"
          },
          {
            title: "C3 Line-Item Changes",
            url: "/person/reports/c3-line-item-changes",
            icon: LineChart,
            requiresPermission: "view_reports"
          }
        ]
      }
    ]
  }
];
