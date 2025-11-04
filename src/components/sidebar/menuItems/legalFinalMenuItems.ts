import { Scale, FileText, Gavel, AlertTriangle, BarChart3, Users } from 'lucide-react';

export const legalFinalMenuItems = [
  {
    title: "Legal Final (TBR)",
    icon: Scale,
    subItems: [
      {
        title: "Dashboard",
        url: "/legal-final",
        icon: BarChart3,
        description: "Legal cases overview and statistics"
      },
      {
        title: "New Case",
        url: "/legal-final/new-case",
        icon: FileText,
        description: "Create new legal case"
      },
      {
        title: "Case Management",
        url: "/legal-final/cases",
        icon: Gavel,
        description: "View and manage all cases"
      },
      {
        title: "Reports",
        url: "/legal-final/reports",
        icon: BarChart3,
        description: "Generate legal reports"
      }
    ]
  }
];