
import { 
  Users, 
  List,
  BarChart3,
  UserCog,
  FileText,
  TrendingUp,
  Calendar,
  ClipboardList,
  PlusCircle
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
            title: "Insured Persons Summary",
            url: "/person/reports/summary",
            icon: BarChart3,
            requiresPermission: "view_reports"
          },
          {
            title: "Active Coverage by Age",
            url: "/person/reports/coverage-by-age",
            icon: TrendingUp,
            requiresPermission: "view_reports"
          },
          {
            title: "Contribution History",
            url: "/person/reports/contribution-history",
            icon: Calendar,
            requiresPermission: "view_reports"
          }
        ]
      }
    ]
  }
];
