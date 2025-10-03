import { Scale, FileText, Calendar, FolderOpen, BarChart3, Settings } from 'lucide-react';

export const ssbLegalMenuItems = [
  {
    title: "SSB Legal",
    icon: Scale,
    subItems: [
      {
        title: "Cases",
        url: "/legal/cases",
        icon: Scale,
        description: "Manage legal cases"
      },
      {
        title: "Hearing Calendar",
        url: "/legal/hearings",
        icon: Calendar,
        description: "Schedule and manage hearings"
      },
      {
        title: "Orders Registry",
        url: "/legal/orders",
        icon: FileText,
        description: "View published orders"
      },
      {
        title: "Documents Center",
        url: "/legal/documents",
        icon: FolderOpen,
        description: "Browse legal documents"
      },
      {
        title: "Reports & Analytics",
        url: "/legal/reports",
        icon: BarChart3,
        description: "Legal reports and analytics"
      },
      {
        title: "Admin",
        url: "/legal/admin",
        icon: Settings,
        description: "Legal module administration"
      }
    ]
  }
];
