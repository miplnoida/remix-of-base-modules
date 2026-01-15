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
  Fingerprint,
  UserCheck,
  Link2,
  Tag
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
        title: "Identity Management",
        icon: Fingerprint,
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Identity Users",
            url: "/admin/identity/users",
            icon: Users,
            requiresPermission: "system_administration"
          },
          {
            title: "Identity Roles",
            url: "/admin/identity/roles",
            icon: ShieldCheck,
            requiresPermission: "system_administration"
          },
          {
            title: "User Role Assignments",
            url: "/admin/identity/user-roles",
            icon: UserCheck,
            requiresPermission: "system_administration"
          },
          {
            title: "Identity Mapping",
            url: "/admin/identity/mapping",
            icon: Link2,
            requiresPermission: "system_administration"
          },
          {
            title: "User & Role Claims",
            url: "/admin/identity/claims",
            icon: Tag,
            requiresPermission: "system_administration"
          }
        ]
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
    title: "Sample Application",
    url: "/sample-applications",
    icon: FileText,
  }
];
