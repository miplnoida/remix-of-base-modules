
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
        url: "/bn/claims",
        icon: Heart,
        requiresPermission: "benefits_management"
      },
      {
        title: "Online Benefit Applications",
        url: "/bn/queue",
        icon: Globe,
        requiresPermission: "benefits_management"
      },
      {
        title: "Maternity Benefits",
        url: "/bn/claims?type=maternity",
        icon: Heart,
        requiresPermission: "process_claims"
      },
      {
        title: "Unemployment Benefits",
        url: "/bn/claims?type=unemployment",
        icon: Users,
        requiresPermission: "process_claims"
      },
      {
        title: "Work Injury Benefits",
        url: "/bn/claims?type=work-injury",
        icon: Shield,
        requiresPermission: "process_claims"
      },
      {
        title: "Death Benefits",
        url: "/bn/claims?type=death",
        icon: Heart,
        requiresPermission: "process_claims"
      },
      {
        title: "Educational Benefits",
        url: "/bn/claims?type=educational",
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
            url: "/admin/notification-templates?tab=core&module=BENEFITS",
            icon: FileText,
            requiresPermission: "benefits_management",
            description: "Opens the shared Core Template Designer filtered to Benefits module"
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
