import { 
  Settings, 
  Users, 
  Shield, 
  FileText,
  History,
  UserCog,
  Building2,
  ShieldCheck,
  Bell,
  Boxes,
  GitBranch,
  Play,
  ListTodo,
  BarChart3,
  Mail,
  ClipboardCheck,
  Layers,
  Lock,
  CheckSquare,
  Trash2,
  Search,
  RotateCcw,
  Globe,
  UserCheck,
  Briefcase,
  Stethoscope,
  Calculator,
  Sliders,
  Calendar,
  Monitor,
  AlertCircle,
  Activity,
  Fingerprint,
  FlaskConical,
  BookOpen,
  Database
} from "lucide-react";

export const systemAdminMenuItems = [
  {
    title: "System Administration",
    icon: Settings,
    subItems: [
      {
        title: "Organization Management",
        icon: Building2,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Foundation",
            icon: Building2,
            requiresPermission: "system_administration",
            subItems: [
              { title: "Organization Profile",  url: "/admin/org/foundation/profile",       icon: Building2, requiresPermission: "system_administration" },
              { title: "Locations / Branches",  url: "/admin/org/foundation/locations",     icon: Building2, requiresPermission: "system_administration" },
              { title: "Departments",           url: "/admin/org/foundation/departments",   icon: UserCog,   requiresPermission: "system_administration" },
              { title: "Modules",               url: "/admin/org/foundation/modules",       icon: Boxes,     requiresPermission: "system_administration" },
              { title: "Designation Hierarchy", url: "/admin/org/foundation/designations",  icon: Layers,    requiresPermission: "system_administration" },
            ],
          },
          {
            title: "Brand Assets",
            icon: FileText,
            requiresPermission: "system_administration",
            subItems: [
              { title: "Media Library",     url: "/admin/org/assets/media",           icon: FileText, requiresPermission: "system_administration" },
              { title: "Letterheads",       url: "/admin/org/assets/letterheads",     icon: FileText, requiresPermission: "system_administration" },
              { title: "Signatures",        url: "/admin/org/assets/signatures",      icon: FileText, requiresPermission: "system_administration" },
              { title: "Headers / Footers", url: "/admin/org/assets/headers-footers", icon: FileText, requiresPermission: "system_administration" },
              { title: "Disclaimers",       url: "/admin/org/assets/disclaimers",     icon: FileText, requiresPermission: "system_administration" },
              { title: "Portal Branding",   url: "/admin/org/assets/portal-branding", icon: Sliders,  requiresPermission: "system_administration" },
              { title: "Document Assets",   url: "/admin/org/assets/document-assets", icon: FileText, requiresPermission: "system_administration" },
              { title: "Asset Categories",  url: "/admin/org/assets/categories",      icon: Layers,   requiresPermission: "system_administration" },
            ],
          },
          {
            title: "Communication Library",
            icon: Mail,
            requiresPermission: "system_administration",
            subItems: [
              {
                title: "Templates",
                icon: Mail,
                requiresPermission: "system_administration",
                subItems: [
                  { title: "All Templates",         url: "/admin/notification-templates?tab=core",                                                     icon: Mail,     requiresPermission: "system_administration" },
                  { title: "Email Templates",       url: "/admin/notification-templates?tab=core&type=EMAIL&channel=EMAIL",                            icon: Mail,     requiresPermission: "system_administration" },
                  { title: "Letter Templates",      url: "/admin/notification-templates?tab=core&type=LETTER&channel=PRINT_LETTER",                    icon: FileText, requiresPermission: "system_administration" },
                  { title: "Notice Templates",      url: "/admin/notification-templates?tab=core&type=NOTICE",                                         icon: FileText, requiresPermission: "system_administration" },
                  { title: "Document Templates",    url: "/admin/notification-templates?tab=core&type=PDF",                                            icon: FileText, requiresPermission: "system_administration" },
                  { title: "Certificate Templates", url: "/admin/notification-templates?tab=core&type=CERTIFICATE",                                    icon: FileText, requiresPermission: "system_administration" },
                  { title: "Statement Templates",   url: "/admin/notification-templates?tab=core&type=STATEMENT",                                      icon: FileText, requiresPermission: "system_administration" },
                  { title: "Receipt Templates",     url: "/admin/notification-templates?tab=core&type=RECEIPT",                                        icon: FileText, requiresPermission: "system_administration" },
                  { title: "Report Templates",      url: "/admin/notification-templates?tab=core&type=REPORT",                                         icon: FileText, requiresPermission: "system_administration" },
                  { title: "SMS Templates",         url: "/admin/notification-templates?tab=core&type=SMS&channel=SMS",                                icon: Bell,     requiresPermission: "system_administration" },
                  { title: "WhatsApp Templates",    url: "/admin/notification-templates?tab=core&type=WHATSAPP",                                       icon: Bell,     requiresPermission: "system_administration" },
                  { title: "In-App Notifications",  url: "/admin/notification-templates?tab=core&type=IN_APP&channel=PORTAL_MSG",                      icon: Bell,     requiresPermission: "system_administration" },
                ],
              },
              { title: "Text Blocks",              url: "/admin/org/library/text-blocks",  icon: FileText, requiresPermission: "system_administration" },
              { title: "Tokens",                   url: "/admin/org/library/tokens",       icon: FileText, requiresPermission: "system_administration" },
              { title: "Categories",               url: "/admin/org/library/categories",   icon: Layers,   requiresPermission: "system_administration" },
              { title: "Channels",                 url: "/admin/org/library/channels",     icon: Bell,     requiresPermission: "system_administration" },
              { title: "Languages / Translations", url: "/admin/org/library/languages",    icon: Globe,    requiresPermission: "system_administration" },
              { title: "Template Assignments",     url: "/admin/configuration/template-assignments", icon: Sliders, requiresPermission: "system_administration" },
            ],
          },
          {
            title: "Configuration Center",
            icon: Sliders,
            requiresPermission: "system_administration",
            subItems: [
              { title: "Communication", url: "/admin/org/configuration-center?domain=communication", icon: Mail,       requiresPermission: "system_administration" },
              { title: "Workflow",      url: "/admin/org/configuration-center?domain=workflow",      icon: GitBranch,  requiresPermission: "system_administration" },
              { title: "Numbering",     url: "/admin/org/configuration-center?domain=numbering",     icon: FileText,   requiresPermission: "system_administration" },
              { title: "Branding",      url: "/admin/org/configuration-center?domain=branding",      icon: Sliders,    requiresPermission: "system_administration" },
              { title: "Reporting",     url: "/admin/org/configuration-center?domain=reporting",     icon: BarChart3,  requiresPermission: "system_administration" },
              { title: "AI",            url: "/admin/org/configuration-center?domain=ai",            icon: FlaskConical,requiresPermission: "system_administration" },
            ],
          },
          {
            title: "Validation & Impact",
            icon: Activity,
            requiresPermission: "system_administration",
            subItems: [
              { title: "Health Dashboard",   url: "/admin/org/validation/health",  icon: Activity,    requiresPermission: "system_administration" },
              { title: "Usage Validation",   url: "/admin/org/validation/usage",   icon: Search,      requiresPermission: "system_administration" },
              { title: "Impact Analysis",    url: "/admin/org/validation/impact",  icon: BarChart3,   requiresPermission: "system_administration" },
              { title: "Broken References",  url: "/admin/org/validation/broken",  icon: AlertCircle, requiresPermission: "system_administration" },
            ],
          },
        ],
      },
      {
        title: "User Management",
        url: "/admin/users",
        icon: Users,
        requiresPermission: "system_administration"
      },
      {
        title: "Roles & Permissions",
        url: "/admin/roles",
        icon: ShieldCheck,
        requiresPermission: "system_administration"
      },
      {
        title: "Module Management",
        url: "/admin/modules",
        icon: Boxes,
        requiresPermission: "system_administration"
      },
      {
        title: "Office Locations",
        url: "/admin/offices",
        icon: Building2,
        requiresPermission: "system_administration"
      },
      {
        title: "Numbering",
        url: "/admin/numbering",
        icon: FileText,
        requiresPermission: "system_administration"
      },
      {
        title: "Departments",
        url: "/admin/departments",
        icon: UserCog,
        requiresPermission: "system_administration"
      },
      {
        title: "Workflow Engine",
        icon: GitBranch,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Workflow Management",
            url: "/admin/workflows",
            icon: GitBranch,
            requiresPermission: "system_administration"
          },
          {
            title: "Workflow Instances",
            url: "/admin/workflow-instances",
            icon: Layers,
            requiresPermission: "system_administration"
          },
          {
            title: "Workflow Triggers",
            url: "/admin/workflow-triggers",
            icon: Play,
            requiresPermission: "system_administration"
          },
          {
            title: "Workflow Logs",
            url: "/admin/workflow-logs",
            icon: History,
            requiresPermission: "system_administration"
          },
          {
            title: "Workflow Analytics",
            url: "/admin/workflow-analytics",
            icon: BarChart3,
            requiresPermission: "system_administration"
          },
          {
            title: "Workflow Security",
            url: "/admin/workflow-security",
            icon: Lock,
            requiresPermission: "system_administration"
          },
          {
            title: "Secured Approvals",
            url: "/admin/workflow-secured-approvals",
            icon: CheckSquare,
            requiresPermission: "system_administration"
          },
          {
            title: "Workflow Role Assignment",
            url: "/admin/workflow-role-assignment",
            icon: Shield,
            requiresPermission: "system_administration"
          }
        ]
      },
      {
        title: "Notifications",
        icon: Bell,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Email Campaigns",
            url: "/admin/email-campaigns",
            icon: Bell,
            requiresPermission: "system_administration"
          },
          {
            title: "Email Delivery Logs",
            url: "/admin/email-logs",
            icon: History,
            requiresPermission: "system_administration"
          },
          {
            title: "Notification Log",
            url: "/admin/notifications/log",
            icon: History,
            requiresPermission: "system_administration"
          },
          {
            title: "Notification Templates",
            url: "/admin/notification-templates",
            icon: FileText,
            requiresPermission: "system_administration"
          },
          {
            title: "Channel Settings",
            url: "/admin/notifications/channels",
            icon: Settings,
            requiresPermission: "system_administration"
          }
        ]
      },
      {
        title: "Security Settings",
        url: "/admin/security",
        icon: Shield,
        requiresPermission: "system_administration"
      },
      {
        title: "Audit Log",
        url: "/admin/audit-log",
        icon: History,
        requiresPermission: "system_administration"
      },
      {
        title: "System Cleanup",
        icon: Trash2,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Cleanup Dashboard",
            url: "/admin/system-cleanup",
            icon: Trash2,
            requiresPermission: "system_administration"
          },
          {
            title: "Modules Inventory",
            url: "/admin/system-cleanup/modules-inventory",
            icon: Layers,
            requiresPermission: "system_administration"
          },
          {
            title: "Dependency Scan",
            url: "/admin/system-cleanup/dependency-scan",
            icon: Search,
            requiresPermission: "system_administration"
          },
          {
            title: "Cleanup Review",
            url: "/admin/system-cleanup/cleanup-review",
            icon: Trash2,
            requiresPermission: "system_administration"
          },
          {
            title: "Rollback & Recovery",
            url: "/admin/system-cleanup/rollback",
            icon: RotateCcw,
            requiresPermission: "system_administration"
          }
        ]
      },
      {
        title: "External API Management",
        icon: Globe,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "External API Configuration",
            url: "/admin/external-apis",
            icon: Globe,
            requiresPermission: "system_administration"
          },
          {
            title: "API Test Console",
            url: "/admin/api-test-console",
            icon: Globe,
            requiresPermission: "system_administration"
          }
        ]
      },
      {
        title: "API Configuration",
        url: "/admin/api-configuration",
        icon: Globe,
        requiresPermission: "system_administration"
      },
      {
        title: "Global Settings",
        url: "/admin/global-settings",
        icon: Sliders,
        requiresPermission: "system_administration"
      },
      {
        title: "C3 Configuration",
        url: "/admin/c3-configuration",
        icon: Calculator,
        requiresPermission: "system_administration"
      },
      {
        title: "System Monitoring & Logs",
        icon: Monitor,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Technical Logs",
            url: "/system-logs/technical",
            icon: FileText,
            requiresPermission: "system_administration"
          },
          {
            title: "Error Logs",
            url: "/system-logs/errors",
            icon: AlertCircle,
            requiresPermission: "system_administration"
          },
          {
            title: "Business Events",
            url: "/system-logs/business",
            icon: Activity,
            requiresPermission: "system_administration"
          },
          {
            title: "Audit Trail",
            url: "/system-logs/audit",
            icon: History,
            requiresPermission: "system_administration"
          },
          {
            title: "Security Logs",
            url: "/system-logs/security",
            icon: Shield,
            requiresPermission: "system_administration"
          },
          {
            title: "Login Verification Logs",
            url: "/system-logs/login-security",
            icon: Fingerprint,
            requiresPermission: "system_administration"
          },
          {
            title: "Integration Logs",
            url: "/system-logs/integration",
            icon: Globe,
            requiresPermission: "system_administration"
          },
          {
            title: "Performance Monitor",
            url: "/system-logs/performance",
            icon: BarChart3,
            requiresPermission: "system_administration"
          },
          {
            title: "Workflow Logs",
            url: "/system-logs/workflows",
            icon: GitBranch,
            requiresPermission: "system_administration"
          }
        ]
      },
      {
        title: "Quality Assurance",
        icon: FlaskConical,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "QA Dashboard",
            url: "/admin/qa",
            icon: BarChart3,
            requiresPermission: "system_administration"
          },
          {
            title: "Knowledge Repository",
            url: "/admin/qa/knowledge",
            icon: BookOpen,
            requiresPermission: "system_administration"
          }
        ]
      },
    ]
  },
  {
    title: "Online Applications",
    icon: Globe,
    subItems: [
      {
        title: "Insured Person Applications",
        url: "/online-applications/insured-person",
        icon: UserCheck,
      },
      {
        title: "Employer Applications",
        url: "/online-applications/employer",
        icon: Briefcase,
      },
      {
        title: "Doctor Applications",
        url: "/online-applications/doctor",
        icon: Stethoscope,
      }
    ]
  },
  {
    title: "My Tasks",
    url: "/workflow/my-tasks",
    icon: ListTodo,
  },
  {
    title: "Applications for Review",
    url: "/workflow/applications-review",
    icon: ClipboardCheck,
  },
  {
    title: "Manage Meetings",
    url: "/meetings/manage",
    icon: Calendar,
  },
  {
    title: "Sample Application",
    url: "/sample-applications",
    icon: FileText,
  }
];
