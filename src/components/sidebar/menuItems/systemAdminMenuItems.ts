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
  Fingerprint
} from "lucide-react";

export const systemAdminMenuItems = [
  {
    title: "System Administration",
    icon: Settings,
    subItems: [
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
          }
        ]
      },
      {
        title: "Notifications",
        icon: Bell,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Notification Log",
            url: "/admin/notifications/log",
            icon: History,
            requiresPermission: "system_administration"
          },
          {
            title: "Templates",
            url: "/admin/notifications/templates",
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
        url: "/admin/external-apis",
        icon: Globe,
        requiresPermission: "system_administration"
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
      }
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
