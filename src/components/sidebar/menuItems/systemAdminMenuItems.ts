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
  BarChart3
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
      }
    ]
  },
  {
    title: "My Tasks",
    url: "/workflow/my-tasks",
    icon: ListTodo,
  }
];
