
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
        title: "IP Management",
        url: "/person/management",
        icon: List,
        requiresPermission: "manage_insured_persons"
      }
    ]
  }
];
