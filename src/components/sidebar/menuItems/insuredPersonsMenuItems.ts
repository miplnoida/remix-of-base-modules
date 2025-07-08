
import { 
  Users, 
  UserCheck, 
  CheckSquare,
  Search,
  IdCard,
  List
} from "lucide-react";

export const insuredPersonsMenuItems = [
  {
    title: "Insured Persons",
    icon: Users,
    subItems: [
      {
        title: "IP Listing",
        url: "/person/listing",
        icon: List,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "Register Person",
        url: "/person/register",
        icon: UserCheck,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "Person Approval",
        url: "/person/approval",
        icon: CheckSquare,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "Person Directory",
        url: "/person/directory",
        icon: Search,
        requiresPermission: "manage_insured_persons"
      },
      {
        title: "ID Card Generation",
        url: "/person/id-cards",
        icon: IdCard,
        requiresPermission: "manage_insured_persons"
      }
    ]
  }
];
