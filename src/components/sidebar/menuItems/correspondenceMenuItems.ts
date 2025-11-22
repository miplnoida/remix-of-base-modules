import { MessageSquare, Inbox, Send, Archive, Search, Bell } from 'lucide-react';

export const correspondenceMenuItems = [
  {
    title: 'Communication Hub',
    icon: MessageSquare,
    subItems: [
      {
        title: 'Correspondence Workspace',
        url: '/correspondence/dashboard',
        icon: Inbox,
        requiresPermission: 'view_correspondence'
      },
      {
        title: 'Incoming Communications',
        url: '/correspondence/incoming',
        icon: Inbox,
        requiresPermission: 'view_correspondence'
      },
      {
        title: 'Outgoing Communications',
        url: '/correspondence/outgoing',
        icon: Send,
        requiresPermission: 'view_correspondence'
      },
      {
        title: 'Search & History',
        url: '/correspondence/search',
        icon: Search,
        requiresPermission: 'view_correspondence'
      },
      {
        title: 'Archive',
        url: '/correspondence/archive',
        icon: Archive,
        requiresPermission: 'view_correspondence'
      },
      {
        title: 'Notification Log',
        url: '/admin/notifications/log',
        icon: Bell,
        requiresPermission: 'view_notifications'
      }
    ]
  }
];
