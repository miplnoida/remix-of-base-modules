import {
  Scale, FileText, Gavel, AlertTriangle, Search, BarChart3, Settings, FolderOpen,
  Code, Building2, DollarSign, Workflow, ShieldCheck, Users, BookOpen, Layers,
  ClipboardList, UserCog, History, CheckSquare, Package,
} from 'lucide-react';

/**
 * Legal sidebar — Legal Admin is grouped into 5 functional sections.
 * Source of truth lives in DB (app_modules table). This file mirrors the
 * seeded structure so the React sidebar can render without an extra DB hop.
 * Permission codes match module names in app_modules.
 */
export const legalMenuItems = [
  {
    title: "NewLegal Module (TBR)",
    icon: Scale,
    subItems: [
      { title: "Legal Dashboard",       url: "/legal",                icon: Scale,         description: "Overview of legal cases and enforcement" },
      { title: "Cases (LG)",            url: "/legal/lg/cases",       icon: FolderOpen,    description: "All legal cases — search, filter, open" },
      { title: "New Legal Case",        url: "/legal/lg/cases/new",   icon: FileText,      description: "Create a new legal case (wizard)" },
      { title: "Hearings Calendar",     url: "/legal/lg/hearings",    icon: Gavel,         description: "Upcoming hearings across all cases" },
      { title: "Case Intake (legacy)",  url: "/legal/case-intake",    icon: FileText,      description: "Legacy intake screen" },
      { title: "Case Tracking",         url: "/legal/case-tracking",  icon: Search,        description: "Monitor case progress and status" },
      { title: "Document Center",       url: "/legal/documents",      icon: FolderOpen,    description: "Manage legal documents and evidence" },
      { title: "Notice Generation",     url: "/legal/notices",        icon: FileText,      description: "Generate legal notices and documents" },
      { title: "Appeal Submission",     url: "/legal/appeals",        icon: AlertTriangle, description: "Manage appeals and reviews" },
      { title: "Enforcement & Penalty", url: "/legal/enforcement",    icon: Gavel,         description: "Track enforcement actions and penalties" },
      { title: "Evidence Management",   url: "/legal/evidence",       icon: FileText,      description: "Manage documents and evidence" },
      { title: "Reports & Analytics",   url: "/legal/reports",        icon: BarChart3,     description: "Generate legal reports and analytics" },
      {
        title: "Legal Admin",
        icon: Settings,
        description: "Configure Legal module",
        url: "/legal/admin",
        subItems: [
          {
            title: "Setup & Identity",
            icon: Building2,
            description: "Department, routing and team configuration",
            subItems: [
              { title: "Department Profile",   url: "/legal/admin/profile",  icon: Building2,    requiresPermission: "lg_admin_profile",  description: "Legal department identity & contact" },
              { title: "Routing & Assignment", url: "/legal/admin/routing",  icon: Workflow,     requiresPermission: "lg_admin_routing",  description: "Case routing strategy" },
              { title: "Teams & Staff",        url: "/legal/admin/teams",    icon: Users,        requiresPermission: "lg_admin_teams",    description: "Lawyers, support staff and capabilities" },
            ],
          },
          {
            title: "Reference & Rules",
            icon: BookOpen,
            description: "Codes, references and workflow rules",
            subItems: [
              { title: "Code Sets",              url: "/legal/admin/code-sets",        icon: Code,        requiresPermission: "lg_admin_codesets",      description: "Dropdown values and reference data" },
              { title: "Legal References",       url: "/legal/admin/legal-references", icon: Scale,       requiresPermission: "lg_admin_legal_refs",    description: "Acts, regulations and policies" },
              { title: "Workflow & Stage Rules", url: "/legal/admin/workflow",         icon: Workflow,    requiresPermission: "lg_admin_policy_config", description: "Department, roles, approvals" },
            ],
          },
          {
            title: "Templates & Documents",
            icon: FileText,
            description: "Templates, document types and stage rules",
            subItems: [
              { title: "Templates",            url: "/legal/admin/templates",            icon: FileText,    requiresPermission: "lg_admin_templates",      description: "Notices, letters and PDFs" },
              { title: "Document Types",       url: "/legal/admin/document-types",       icon: FolderOpen,  requiresPermission: "lg_admin_doc_types",      description: "Legal document type catalog" },
              { title: "Stage Document Rules", url: "/legal/admin/stage-document-rules", icon: Layers,      requiresPermission: "lg_admin_stage_doc_rules",description: "Documents required at each stage" },
            ],
          },
          {
            title: "Fees & Waivers",
            icon: DollarSign,
            description: "Fees, bundles and waiver policies",
            subItems: [
              { title: "Fee Configuration", url: "/legal/admin/fees",            icon: DollarSign,  requiresPermission: "lg_admin_fee_config",    description: "Rules and charges" },
              { title: "Fee Bundles",       url: "/legal/admin/fee-bundles",     icon: Package,     requiresPermission: "lg_admin_fee_bundles",   description: "Pre-defined fee bundles" },
              { title: "Waiver Policies",   url: "/legal/admin/waiver-policies", icon: ShieldCheck, requiresPermission: "lg_admin_waiver_policy", description: "Tiered waiver approval routing" },
            ],
          },
          {
            title: "Governance",
            icon: ShieldCheck,
            description: "Permissions, audit and validation",
            subItems: [
              { title: "Permissions",        url: "/legal/admin/permissions", icon: UserCog,      requiresPermission: "lg_admin_permissions",         description: "Legal role-permission matrix" },
              { title: "Audit Log",          url: "/legal/admin/audit",       icon: History,      requiresPermission: "lg_admin_audit_log",           description: "Legal configuration audit log" },
              { title: "Validation Report",  url: "/legal/admin/validation",  icon: CheckSquare,  requiresPermission: "lg_admin_validation_report",   description: "Legal configuration validation" },
            ],
          },
        ],
      },
    ],
  },
];
