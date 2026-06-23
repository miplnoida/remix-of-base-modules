
import {
  Building2,
  UserCheck,
  CheckSquare,
  DollarSign,
  Search,
  TrendingUp,
  BookOpen,
  Eye,
} from "lucide-react";

export const employerMenuItems = [
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
        title: "Employer 360°",
        url: "/compliance/field/employer-360",
        icon: Eye,
        requiresPermission: "manage_employers",
        description: "Unified employer view — financials, cases, ledger, comms"
      },
      {
        title: "Employer Ledger",
        url: "/compliance/field/employer-360",
        icon: BookOpen,
        requiresPermission: "manage_employers",
        description: "Pick an employer, then open Ledger from the 360° header"
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
      }
    ]
  }
];

