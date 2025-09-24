import { Scale, FileText, Gavel, AlertTriangle, Search, BarChart3 } from 'lucide-react';

export const legalMenuItems = [
  {
    title: "Legal Module",
    icon: Scale,
    items: [
      {
        title: "Legal Dashboard",
        href: "/legal",
        icon: Scale,
        description: "Overview of legal cases and enforcement"
      },
      {
        title: "Case Intake",
        href: "/legal/case-intake",
        icon: FileText,
        description: "Register new legal cases"
      },
      {
        title: "Case Tracking",
        href: "/legal/case-tracking",
        icon: Search,
        description: "Monitor case progress and status"
      },
      {
        title: "Notice Generation",
        href: "/legal/notices",
        icon: FileText,
        description: "Generate legal notices and documents"
      },
      {
        title: "Appeal Submission",
        href: "/legal/appeals",
        icon: AlertTriangle,
        description: "Manage appeals and reviews"
      },
      {
        title: "Enforcement & Penalty",
        href: "/legal/enforcement",
        icon: Gavel,
        description: "Track enforcement actions and penalties"
      },
      {
        title: "Evidence Management",
        href: "/legal/evidence",
        icon: FileText,
        description: "Manage documents and evidence"
      },
      {
        title: "Reports & Analytics",
        href: "/legal/reports",
        icon: BarChart3,
        description: "Generate legal reports and analytics"
      }
    ]
  }
];