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
  GitBranch,
  Tag,
  AlertTriangle,
  Layers,
  FileCheck,
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
        title: "Claim Queue",
        url: "/bn/queue",
        icon: Inbox,
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
          {
            title: "Calculation Engine",
            url: "/bn/engine",
            icon: FlaskConical,
            requiresPermission: "benefits_management",
            description: "Run, simulate, and audit benefit calculations",
          },
          {
            title: "Transition Matrix",
            url: "/bn/config/transitions",
            icon: GitBranch,
            requiresPermission: "benefits_management",
            description: "View and manage claim status transition rules",
          },
          {
            title: "Reason Codes",
            url: "/bn/config/reason-codes",
            icon: Tag,
            requiresPermission: "benefits_management",
            description: "Manage denial, suspension, and escalation reasons",
          },
          {
            title: "Workbaskets",
            url: "/bn/config/workbaskets",
            icon: Layers,
            requiresPermission: "benefits_management",
            description: "Configure claim queues and workload distribution",
          },
          {
            title: "Escalation Policies",
            url: "/bn/config/escalation",
            icon: AlertTriangle,
            requiresPermission: "benefits_management",
            description: "Configure SLA breach and manual escalation rules",
          },
        ],
      },
    ],
  },
];
