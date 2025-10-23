import { DollarSign, BarChart3, Receipt, Search, FileText, Database, TrendingUp, Settings, Users2, AlertCircle } from 'lucide-react';

export const financeMenuItems = [
  {
    title: 'SSB Finance',
    icon: DollarSign,
    subItems: [
      {
        title: 'Finance Dashboard',
        url: '/finance/dashboard',
        icon: BarChart3,
      },
      {
        title: 'Batch Management',
        url: '/finance/batch-management',
        icon: Receipt,
      },
      {
        title: 'Payment Entry',
        url: '/finance/payment-entry',
        icon: DollarSign,
      },
      {
        title: 'Receipt Search',
        url: '/finance/receipt-search',
        icon: Search,
      },
      {
        title: 'Invoice Management',
        url: '/finance/invoices',
        icon: FileText,
      },
      {
        title: 'GL & SAGE Export',
        url: '/finance/gl-export',
        icon: Database,
      },
      {
        title: 'Daily Reports',
        url: '/finance/daily-reports',
        icon: TrendingUp,
      },
      {
        title: 'Reversal & Penalties',
        url: '/finance/reversals',
        icon: AlertCircle,
      },
      {
        title: 'Admin Configuration',
        url: '/finance/admin-config',
        icon: Settings,
      },
      {
        title: 'User Management',
        url: '/finance/user-management',
        icon: Users2,
      },
    ],
  },
];
