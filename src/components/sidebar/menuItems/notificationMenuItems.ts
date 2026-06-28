import { 
  Bell, 
  Settings, 
  Send, 
  User, 
  Inbox, 
  BarChart3, 
  Shield 
} from 'lucide-react';

export const notificationMenuItems = [
  {
    title: "Notification Management",
    url: "#",
    icon: Bell,
    isExpanded: false,
    subItems: [
      {
        title: "Dashboard",
        url: "/notifications/dashboard",
        icon: BarChart3,
        description: "Overview of notification system performance"
      },
      {
        title: "Template Management",
        url: "/admin/notification-templates",
        icon: Settings,
        description: "Create and manage notification templates"
      },
      {
        title: "Action Mapping",
        url: "/notifications/actions",
        icon: Send,
        description: "Map events to notification templates"
      },
      {
        title: "Delivery Management",
        url: "/notifications/delivery",
        icon: Send,
        description: "Configure delivery settings and schedules"
      },
      {
        title: "User Preferences",
        url: "/notifications/preferences",
        icon: User,
        description: "Manage user notification preferences"
      },
      {
        title: "Notification Center",
        url: "/notifications/center",
        icon: Inbox,
        description: "View and manage in-app notifications"
      },
      {
        title: "Reports & Analytics",
        url: "/notifications/reports",
        icon: BarChart3,
        description: "Detailed reports and email logs"
      },
      {
        title: "Administration",
        url: "/notifications/admin",
        icon: Shield,
        description: "Security settings and audit logs"
      }
    ]
  }
];