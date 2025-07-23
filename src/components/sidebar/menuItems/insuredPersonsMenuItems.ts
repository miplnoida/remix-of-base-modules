
import { 
  Users, 
  List,
  BarChart3,
  UserCog
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
        requiresPermission: "manage_insured_persons",
        subItems: [
          {
            title: "Pending Reviews",
            url: "/person/pending-reviews",
            icon: List,
            requiresPermission: "manage_insured_persons"
          }
        ]
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
      }
    ]
  }
];
