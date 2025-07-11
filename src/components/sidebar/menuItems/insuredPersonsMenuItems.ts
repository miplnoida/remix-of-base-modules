
import { 
  Users, 
  BarChart3,
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
        icon: BarChart3,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "IP Listing",
        url: "/person/listing",
        icon: List,
        requiresPermission: "manage_insured_persons"
      }
    ]
  }
];
