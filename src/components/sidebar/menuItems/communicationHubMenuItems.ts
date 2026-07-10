import {
  Radio,
  LayoutDashboard,
  FileText,
  Palette,
  Send,
  Inbox,
  ShieldCheck,
  Mail,
  Bell,
  Sliders,
  Boxes,
  ListTodo,
  Activity,
  RefreshCw,
  Printer,
  ScrollText,
  History,
  Layers,
  Settings,
  FlaskConical,
  Rocket,
} from "lucide-react";

/**
 * Enterprise Communication Hub — top-level sidebar shell (Phase 1).
 *
 * Non-destructive consolidation: every non-placeholder URL points at an
 * EXISTING route. Placeholder pages under /admin/communication-hub/* are
 * empty stubs owned by this hub for future phases. No runtime sending
 * behavior is changed by this menu.
 */
export const communicationHubMenuItems = [
  {
    title: "Enterprise Communication Hub",
    icon: Radio,
    subItems: [
      {
        title: "Overview",
        url: "/admin/communication-hub",
        icon: LayoutDashboard,
        requiresPermission: "system_administration",
      },
      {
        title: "Control Center",
        url: "/admin/communication-hub/control-center",
        icon: ShieldCheck,
        requiresPermission: "system_administration",
      },
      {
        title: "Design & Templates",
        url: "/admin/communication-hub/design",
        icon: Palette,
        requiresPermission: "system_administration",
      },
      {
        title: "Module Onboarding",
        url: "/admin/communication-hub/onboarding",
        icon: Boxes,
        requiresPermission: "system_administration",
      },
      {
        title: "Testing & Pilots",
        url: "/admin/communication-hub/pilots",
        icon: FlaskConical,
        requiresPermission: "system_administration",
      },
      {
        title: "Governance & Live Control",
        url: "/admin/communication-hub/governance",
        icon: Rocket,
        requiresPermission: "system_administration",
      },
      {
        title: "Templates & Content",
        icon: FileText,
        requiresPermission: "system_administration",
        subItems: [
          { title: "Template Library",              url: "/admin/notification-templates",              icon: FileText, requiresPermission: "system_administration" },
          { title: "Template Management Workspace", url: "/admin/template-management",                 icon: FileText, requiresPermission: "system_administration" },
          { title: "Text Blocks",                   url: "/admin/org/library/text-blocks",             icon: FileText, requiresPermission: "system_administration" },
          { title: "Document Assets",               url: "/admin/org/assets/document-assets",          icon: FileText, requiresPermission: "system_administration" },
        ],
      },
      {
        title: "Branding & Assets",
        icon: Palette,
        requiresPermission: "system_administration",
        subItems: [
          { title: "Media Library",     url: "/admin/org/assets/media",           icon: Boxes,   requiresPermission: "system_administration" },
          { title: "Letterheads",       url: "/admin/org/assets/letterheads",     icon: FileText, requiresPermission: "system_administration" },
          { title: "Signatures",        url: "/admin/org/assets/signatures",      icon: FileText, requiresPermission: "system_administration" },
          { title: "Headers / Footers", url: "/admin/org/assets/headers-footers", icon: FileText, requiresPermission: "system_administration" },
          { title: "Disclaimers",       url: "/admin/org/assets/disclaimers",     icon: FileText, requiresPermission: "system_administration" },
          { title: "Portal Branding",   url: "/admin/org/assets/portal-branding", icon: Sliders,  requiresPermission: "system_administration" },
        ],
      },
      {
        title: "Delivery Infrastructure",
        icon: Send,
        requiresPermission: "system_administration",
        subItems: [
          { title: "Provider Settings",       url: "/admin/notifications/providers",                                icon: Settings, requiresPermission: "system_administration" },
          { title: "Channels (deprecated)",   url: "/admin/notifications/channels",                                 icon: Layers,   requiresPermission: "system_administration" },
          { title: "Configuration Center",    url: "/admin/org/configuration-center?domain=communication",          icon: Sliders,  requiresPermission: "system_administration" },
        ],
      },
      {
        title: "Operations",
        icon: Activity,
        requiresPermission: "system_administration",
        subItems: [
          { title: "Communication Requests", url: "/admin/communication-hub/requests",           icon: ListTodo,    requiresPermission: "system_administration" },
          { title: "Delivery Monitor",       url: "/admin/communication-hub/delivery-monitor",   icon: Activity,    requiresPermission: "system_administration" },
          { title: "Failed & Retry Queue",   url: "/admin/communication-hub/retry-queue",        icon: RefreshCw,   requiresPermission: "system_administration" },
          { title: "Print Queue",            url: "/admin/communication-hub/print-queue",        icon: Printer,     requiresPermission: "system_administration" },
          { title: "Dispatch Register",      url: "/admin/communication-hub/dispatch-register",  icon: ScrollText,  requiresPermission: "system_administration" },
          { title: "Lifecycle Event Log",    url: "/admin/communication-hub/lifecycle-log",      icon: History,     requiresPermission: "system_administration" },
        ],
      },
      {
        title: "Correspondence Workspace",
        url: "/correspondence/dashboard",
        icon: Inbox,
        requiresPermission: "view_correspondence",
      },
      {
        title: "Notification Log",
        url: "/admin/notifications/log",
        icon: Bell,
        requiresPermission: "view_notifications",
      },
      {
        title: "Governance & Validation",
        icon: ShieldCheck,
        requiresPermission: "system_administration",
        subItems: [
          { title: "Health & Impact",           url: "/admin/org/validation/health",         icon: ShieldCheck, requiresPermission: "system_administration" },
          { title: "Usage Analysis",            url: "/admin/org/validation/usage",          icon: ShieldCheck, requiresPermission: "system_administration" },
          { title: "Communication Governance",  url: "/admin/template-management/validation", icon: Mail,       requiresPermission: "system_administration" },
        ],
      },
    ],
  },
];
