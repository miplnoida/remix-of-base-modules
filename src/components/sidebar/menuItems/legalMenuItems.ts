import { Scale, FileText, Gavel, AlertTriangle, Search, BarChart3, Settings, FolderOpen } from 'lucide-react';

export const legalMenuItems = [
  {
    title: "NewLegal Module (TBR)",
    icon: Scale,
    subItems: [
      {
        title: "Legal Dashboard",
        url: "/legal",
        icon: Scale,
        description: "Overview of legal cases and enforcement"
      },
      {
        title: "Case Intake",
        url: "/legal/case-intake",
        icon: FileText,
        description: "Register new legal cases"
      },
      {
        title: "Case Tracking",
        url: "/legal/case-tracking",
        icon: Search,
        description: "Monitor case progress and status"
      },
      {
        title: "Document Center",
        url: "/legal/documents",
        icon: FolderOpen,
        description: "Manage legal documents and evidence"
      },
      {
        title: "Notice Generation",
        url: "/legal/notices",
        icon: FileText,
        description: "Generate legal notices and documents"
      },
      {
        title: "Appeal Submission",
        url: "/legal/appeals",
        icon: AlertTriangle,
        description: "Manage appeals and reviews"
      },
      {
        title: "Enforcement & Penalty",
        url: "/legal/enforcement",
        icon: Gavel,
        description: "Track enforcement actions and penalties"
      },
      {
        title: "Evidence Management",
        url: "/legal/evidence",
        icon: FileText,
        description: "Manage documents and evidence"
      },
      {
        title: "Reports & Analytics",
        url: "/legal/reports",
        icon: BarChart3,
        description: "Generate legal reports and analytics"
      },
      {
        title: "Admin Configuration",
        url: "/legal/admin",
        icon: Settings,
        description: "Configure code sets, templates, and integrations"
      }
    ]
  }
];