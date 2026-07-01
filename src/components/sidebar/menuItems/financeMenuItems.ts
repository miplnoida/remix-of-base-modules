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
  Archive,
  Printer
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
        title: 'Payment Arrangements',
        url: '/finance/arrangements',
        icon: ClipboardList,
        requiresPermission: 'manage_finance',
        description: 'Central payment arrangements (Compliance, Legal, Finance)'
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
        title: 'Accounts Payable',
        icon: Banknote,
        subItems: [
          { title: 'Pending Payables', url: '/finance/accounts-payable/pending', icon: AlertCircle },
          { title: 'Create AP Batch', url: '/finance/accounts-payable/create-batch', icon: PlusCircle },
          { title: 'AP Batch List', url: '/finance/accounts-payable/batches', icon: ClipboardList },
          { title: 'Accounts Verification', url: '/finance/accounts-payable/accounts-verification', icon: CheckSquare },
          { title: 'Benefits Verification', url: '/finance/accounts-payable/benefits-verification', icon: CheckSquare },
          { title: 'Check Printing', url: '/finance/accounts-payable/check-printing', icon: Printer },
          { title: 'Direct Deposit Files', url: '/finance/accounts-payable/dd-generation', icon: Archive },
          { title: 'AP Posting History', url: '/finance/accounts-payable/posting-history', icon: FileText },
          { title: 'AP Corrections', url: '/finance/accounts-payable/corrections', icon: AlertCircle },
          { title: 'AP Reports', url: '/finance/accounts-payable/reports', icon: BarChart3 },
          { title: 'Benefit Pay Runs', url: '/finance/accounts-payable/pay-runs', icon: ClipboardList },
          { title: 'Generate Payments', url: '/finance/accounts-payable/generate-payments', icon: Printer },
          { title: 'Payment Inquiry', url: '/finance/accounts-payable/payment-inquiry', icon: Search },
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
          },
          {
            title: 'Benefit-Finance Mapping',
            url: '/finance/settings/benefit-finance-mapping',
            icon: Database,
            requiresPermission: 'admin'
          },
          {
            title: 'Templates',
            url: '/admin/notification-templates?tab=core&module=PAYMENTS',
            icon: FileText,
            requiresPermission: 'admin',
            description: 'Opens the shared Core Template Designer filtered to Payments module'
          }
        ]
      }
    ]
  }
];
