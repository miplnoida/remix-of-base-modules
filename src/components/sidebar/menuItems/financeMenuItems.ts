import { DollarSign, Users, Settings, FileText, TrendingUp, Receipt, CreditCard, Database, BarChart3, Shield } from 'lucide-react';

export const financeMenuItems = [
  {
    title: 'SSB Finance',
    icon: DollarSign,
    items: [
      {
        title: 'Finance Dashboard',
        url: '/finance/dashboard',
        icon: BarChart3,
      },
      {
        title: 'Cashiering',
        icon: CreditCard,
        items: [
          {
            title: 'Open Batch',
            url: '/finance/cashier/open-batch',
          },
          {
            title: 'Payment Entry',
            url: '/finance/cashier/payment-entry',
          },
          {
            title: 'Receipt Generation',
            url: '/finance/cashier/receipts',
          },
          {
            title: 'Close Batch',
            url: '/finance/cashier/close-batch',
          },
          {
            title: 'Batch Management',
            url: '/finance/cashier/batch-management',
          },
        ],
      },
      {
        title: 'Invoicing',
        icon: FileText,
        items: [
          {
            title: 'Create Invoice',
            url: '/finance/invoice/create',
          },
          {
            title: 'Invoice Payment',
            url: '/finance/invoice/payment',
          },
          {
            title: 'Invoice Registry',
            url: '/finance/invoice/registry',
          },
        ],
      },
      {
        title: 'GL Accounting',
        icon: Database,
        items: [
          {
            title: 'Fund to GL Mapping',
            url: '/finance/gl/mapping',
          },
          {
            title: 'SAGE Export',
            url: '/finance/gl/sage-export',
          },
          {
            title: 'Bank Routing Setup',
            url: '/finance/gl/bank-routing',
          },
        ],
      },
      {
        title: 'Reports & Compliance',
        icon: TrendingUp,
        items: [
          {
            title: 'Daily Reports',
            url: '/finance/reports/daily',
          },
          {
            title: 'Reversal Dashboard',
            url: '/finance/reports/reversals',
          },
          {
            title: 'Penalty Registry',
            url: '/finance/reports/penalties',
          },
          {
            title: 'MIS/Inspector View',
            url: '/finance/reports/mis',
          },
        ],
      },
      {
        title: 'Admin Control',
        icon: Shield,
        items: [
          {
            title: 'User Role Management',
            url: '/finance/admin/roles',
          },
          {
            title: 'Head/Service Config',
            url: '/finance/admin/heads',
          },
          {
            title: 'Lookup Management',
            url: '/finance/admin/lookups',
          },
          {
            title: 'Batch Locking',
            url: '/finance/admin/batch-locking',
          },
          {
            title: 'System Logging',
            url: '/finance/admin/logs',
          },
        ],
      },
    ],
  },
];
