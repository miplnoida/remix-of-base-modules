import { DollarSign, CreditCard, FileText, Database, TrendingUp, Shield, BarChart3, Receipt, Upload, Settings, History, AlertCircle, Users2, Book, Lock, FileBox } from 'lucide-react';

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
        title: 'Open Batch',
        url: '/finance/cashier/open-batch',
        icon: Receipt,
      },
      {
        title: 'Payment Entry',
        url: '/finance/cashier/payment-entry',
        icon: CreditCard,
      },
      {
        title: 'Receipt Generation',
        url: '/finance/cashier/receipts',
        icon: FileText,
      },
      {
        title: 'Close Batch',
        url: '/finance/cashier/close-batch',
        icon: Lock,
      },
      {
        title: 'Batch Management',
        url: '/finance/cashier/batch-management',
        icon: FileBox,
      },
      {
        title: 'Create Invoice',
        url: '/finance/invoice/create',
        icon: Upload,
      },
      {
        title: 'Invoice Payment',
        url: '/finance/invoice/payment',
        icon: DollarSign,
      },
      {
        title: 'Invoice Registry',
        url: '/finance/invoice/registry',
        icon: Book,
      },
      {
        title: 'Fund to GL Mapping',
        url: '/finance/gl/mapping',
        icon: Database,
      },
      {
        title: 'SAGE Export',
        url: '/finance/gl/sage-export',
        icon: Upload,
      },
      {
        title: 'Bank Routing Setup',
        url: '/finance/gl/bank-routing',
        icon: Settings,
      },
      {
        title: 'Daily Reports',
        url: '/finance/reports/daily',
        icon: BarChart3,
      },
      {
        title: 'Reversal Dashboard',
        url: '/finance/reports/reversals',
        icon: History,
      },
      {
        title: 'Penalty Registry',
        url: '/finance/reports/penalties',
        icon: AlertCircle,
      },
      {
        title: 'MIS/Inspector View',
        url: '/finance/reports/mis',
        icon: TrendingUp,
      },
      {
        title: 'User Role Management',
        url: '/finance/admin/roles',
        icon: Users2,
      },
      {
        title: 'Head/Service Config',
        url: '/finance/admin/heads',
        icon: Settings,
      },
      {
        title: 'Lookup Management',
        url: '/finance/admin/lookups',
        icon: Book,
      },
      {
        title: 'Batch Locking',
        url: '/finance/admin/batch-locking',
        icon: Lock,
      },
      {
        title: 'System Logging',
        url: '/finance/admin/logs',
        icon: FileText,
      },
    ],
  },
];
