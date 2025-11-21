import { 
  DollarSign, 
  BarChart3, 
  Receipt, 
  Search, 
  FileText, 
  Database, 
  TrendingUp, 
  Settings, 
  Users2, 
  AlertCircle,
  CreditCard,
  Calculator,
  Banknote,
  PlusCircle,
  Building,
  ClipboardList,
  CheckSquare,
  Archive
} from 'lucide-react';

export const financeMenuItems = [
  {
    title: 'Finance',
    icon: DollarSign,
    subItems: [
      {
        title: 'Finance Dashboard',
        url: '/finance/dashboard',
        icon: BarChart3,
      },
      {
        title: 'Cashier & Payments',
        icon: CreditCard,
        subItems: [
          {
            title: 'Create Invoice',
            url: '/cashier/create-invoice',
            icon: PlusCircle,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'Search & Pay Invoices',
            url: '/cashier/search-pay-invoices',
            icon: Search,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'Daily Invoice Report',
            url: '/cashier/daily-invoice-report',
            icon: ClipboardList,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'C3 Contributions',
            url: '/cashier/c3-payments',
            icon: Banknote,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'Cash Details Entry',
            url: '/cashier/cash-details',
            icon: Calculator,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'Funds Transfer',
            url: '/cashier/funds-transfer',
            icon: Settings,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'Check Management',
            url: '/cashier/check-management',
            icon: FileText,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'Receipt Preview',
            url: '/cashier/receipt',
            icon: Receipt,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'Batch Management',
            url: '/cashier/batch-management',
            icon: Calculator,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'Cashier Batch Closing',
            url: '/cashier/batch-closing',
            icon: CheckSquare,
            requiresPermission: 'cashier_operations'
          },
          {
            title: 'GL Posting Summary',
            url: '/cashier/gl-posting',
            icon: TrendingUp,
            requiresPermission: 'cashier_supervisor'
          }
        ]
      },
      {
        title: 'Settings',
        icon: Settings,
        subItems: [
          {
            title: 'Sage',
            icon: Settings,
            subItems: [
              {
                title: 'Chart of Accounts Mapping',
                url: '/cashier/chart-accounts-mapping',
                icon: FileText,
                requiresPermission: 'admin'
              },
              {
                title: 'Payment Types Mapping',
                url: '/cashier/payment-types-mapping',
                icon: Calculator,
                requiresPermission: 'admin'
              },
              {
                title: 'Sage Synchronization',
                url: '/cashier/sage-sync',
                icon: Settings,
                requiresPermission: 'admin'
              },
              {
                title: 'Current Accounts Setup',
                url: '/cashier/current-accounts',
                icon: Banknote,
                requiresPermission: 'admin'
              },
              {
                title: 'Bank Reconciliation Accounts',
                url: '/cashier/reconciliation-accounts',
                icon: CheckSquare,
                requiresPermission: 'admin'
              }
            ]
          },
          {
            title: 'Fee Configuration',
            url: '/finance/settings/fee-configuration',
            icon: DollarSign,
            requiresPermission: 'admin',
            description: 'Central fee management for all modules'
          },
          {
            title: 'Service Type Management',
            url: '/finance/settings/service-types',
            icon: FileText,
            requiresPermission: 'admin'
          },
          {
            title: 'Verification Settings',
            url: '/finance/settings/verification',
            icon: CheckSquare,
            requiresPermission: 'admin'
          },
          {
            title: 'Multi-Currency Settings',
            url: '/finance/settings/multi-currency',
            icon: DollarSign,
            requiresPermission: 'admin'
          }
        ]
      }
    ]
  }
];
