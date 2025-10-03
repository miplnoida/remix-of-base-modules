import { 
  Scale, 
  FileText, 
  Calendar, 
  Folder, 
  BarChart3, 
  Settings,
  Gavel
} from 'lucide-react';

export const legalMenuItems = [
  {
    title: 'SSB Legal',
    icon: Scale,
    items: [
      {
        title: 'Cases',
        icon: Gavel,
        url: '/legal/cases',
      },
      {
        title: 'Hearings Calendar',
        icon: Calendar,
        url: '/legal/hearings',
      },
      {
        title: 'Orders Registry',
        icon: FileText,
        url: '/legal/orders',
      },
      {
        title: 'Documents Center',
        icon: Folder,
        url: '/legal/documents',
      },
      {
        title: 'Reports & Analytics',
        icon: BarChart3,
        url: '/legal/reports',
      },
      {
        title: 'Admin',
        icon: Settings,
        url: '/legal/admin',
      },
    ],
  },
];
