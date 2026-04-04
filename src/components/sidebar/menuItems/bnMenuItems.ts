import {
  Heart,
  Settings,
  FileText,
  ClipboardList,
  Users,
  Calculator,
  Globe,
  Inbox,
  FlaskConical,
} from "lucide-react";

export const bnMenuItems = [
  {
    title: "Benefit Management",
    icon: Heart,
    subItems: [
      {
        title: "Claim Worklist",
        url: "/bn/claims",
        icon: ClipboardList,
        requiresPermission: "benefits_management",
      },
      {
        title: "Register New Claim",
        url: "/bn/intake/register",
        icon: FileText,
        requiresPermission: "benefits_management",
      },
      {
        title: "Configuration",
        icon: Settings,
        requiresPermission: "benefits_management",
        subItems: [
          {
            title: "Product Catalog",
            url: "/bn/config/products",
            icon: Globe,
            requiresPermission: "benefits_management",
            description: "Manage benefit types and versions",
          },
        ],
      },
    ],
  },
];
