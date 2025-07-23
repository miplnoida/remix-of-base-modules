
import { 
  Users, 
  List
} from "lucide-react";

export const insuredPersonsMenuItems = [
  {
    title: "Insured Persons",
    icon: Users,
    subItems: [
      {
        title: "Dashboard",
        url: "/person/management",
        icon: List,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "IP Management",
        url: "/person/ip-management",
        icon: List,
        requiresPermission: "manage_insured_persons"
      }
    ]
  }
];
