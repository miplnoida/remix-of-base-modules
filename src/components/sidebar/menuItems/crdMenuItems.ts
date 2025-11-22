import { LucideIcon, Users, CreditCard, FileText, BarChart3 } from 'lucide-react';

export interface MenuItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
  subItems?: MenuItem[];
}

export const crdMenuItems: MenuItem[] = [
  {
    label: 'Customer Relationship',
    icon: Users,
    subItems: [
      {
        label: 'Dashboard',
        href: '/crd/dashboard',
        icon: BarChart3
      },
      {
        label: 'Registrations & Cards',
        icon: CreditCard,
        subItems: [
          {
            label: 'Card Management',
            href: '/crd/cards'
          }
        ]
      },
      {
        label: 'Reports',
        icon: FileText,
        subItems: [
          {
            label: 'Printed & Spoiled Cards',
            href: '/crd/reports/printed-spoiled-cards'
          }
        ]
      }
    ]
  }
];
