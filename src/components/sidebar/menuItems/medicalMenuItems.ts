import { 
  Stethoscope, 
  FileText, 
  Users, 
  Plus,
  ClipboardList
} from "lucide-react";

export const medicalMenuItems = [
  {
    title: "Medical",
    icon: Stethoscope,
    subItems: [
      {
        title: "Doctor Applications",
        url: "/medical/applications",
        icon: FileText,
        description: "Manage doctor registration applications"
      },
      {
        title: "New Manual Application",
        url: "/medical/applications/new",
        icon: Plus,
        description: "Enter paper application manually"
      },
      {
        title: "Doctor Registry",
        url: "/medical/registry",
        icon: Users,
        description: "View and manage approved doctors"
      },
      {
        title: "Claims by Doctors",
        url: "/medical/claims",
        icon: ClipboardList,
        description: "View benefit claims initiated by doctors"
      }
    ]
  }
];
