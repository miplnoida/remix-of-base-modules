
import { 
  Heart, 
  Users, 
  Shield, 
  FileText,
  Globe,
  Settings,
  UserCircle
} from "lucide-react";

export const benefitsMenuItems = [
  {
    title: "Benefits Management",
    icon: Heart,
    subItems: [
      {
        title: "Person 360",
        url: "/bn/person-360",
        icon: UserCircle,
        requiresPermission: "benefits_management"
      },
      {
        title: "All Benefits",
        url: "/benefits/all",
        icon: Heart,
        requiresPermission: "benefits_management"
      },
      {
        title: "Online Benefit Applications",
        url: "/benefits/online-applications",
        icon: Globe,
        requiresPermission: "benefits_management"
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
      },
      {
        title: "Settings",
        icon: Settings,
        requiresPermission: "benefits_management",
        subItems: [
          {
            title: "Calculation Setup",
            url: "/bn/config/calculation",
            icon: Settings,
            requiresPermission: "benefits_management",
            description: "Formulas, rate / tier / matrix tables, variables, product bindings, simulation"
          },
          {
            title: "Communication Templates",
            url: "/bn/config/communication-templates",
            icon: FileText,
            requiresPermission: "benefits_management",
            description: "Manage benefit notification templates — letters, emails, SMS, in-app"
          },
          {
            title: "Reference Data",
            url: "/bn/config/reference-data",
            icon: Settings,
            requiresPermission: "benefits_management",
            description: "Manage dropdown values used across Benefits configuration (table types, statuses, methods)"
          }
        ]
      }
    ]
  }
];
