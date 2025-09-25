import { 
  CreditCard, 
  Calculator, 
  FileText, 
  Settings, 
  BarChart3,
  Receipt,
  Banknote,
  Search,
  PlusCircle,
  DollarSign,
  Building,
  Users,
  ClipboardList,
  TrendingUp,
  CheckSquare,
  Archive
} from "lucide-react";

export const cashierMenuItems = [
  {
    title: "Cashier & Payments",
    icon: CreditCard,
    subItems: [
      {
        title: "Miscellaneous Payments (TBR)",
        url: "/cashier/misc-payments",
        icon: Receipt,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Search & Pay Invoices",
        url: "/cashier/search-pay-invoices",
        icon: Search,
        requiresPermission: "cashier_operations"
      },
      {
        title: "C3 Contributions",
        url: "/cashier/c3-payments",
        icon: Banknote,
        requiresPermission: "cashier_operations"
      },
      {
        title: "EFT Entry (TBR)",
        url: "/cashier/eft-entry",
        icon: Archive,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Cash Details Entry",
        url: "/cashier/cash-details",
        icon: Calculator,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Funds Transfer",
        url: "/cashier/funds-transfer",
        icon: Settings,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Check Management",
        url: "/cashier/check-management",
        icon: FileText,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Receipt Preview",
        url: "/cashier/receipt",
        icon: Receipt,
        requiresPermission: "cashier_operations"
      }
    ]
  },
  {
    title: "Invoice-Based Payments",
    icon: FileText,
    subItems: [
      {
        title: "Create Invoice",
        url: "/cashier/create-invoice",
        icon: PlusCircle,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Daily Invoice Report",
        url: "/cashier/daily-invoice-report",
        icon: ClipboardList,
        requiresPermission: "cashier_operations"
      }
    ]
  },
  {
    title: "Collections",
    icon: DollarSign,
    subItems: [
      {
        title: "Contribution Receipts",
        url: "/cashier/contribution-receipts",
        icon: Receipt,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Rent Receipts",
        url: "/cashier/rent-receipts",
        icon: Building,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Loan Receipts",
        url: "/cashier/loan-receipts",
        icon: Banknote,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Service Receipts",
        url: "/cashier/service-receipts",
        icon: Users,
        requiresPermission: "cashier_operations"
      }
    ]
  },
  {
    title: "Day-End Processing",
    icon: Archive,
    subItems: [
      {
        title: "Batch Management",
        url: "/cashier/batch-management",
        icon: Calculator,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Cashier Batch Closing",
        url: "/cashier/batch-closing",
        icon: CheckSquare,
        requiresPermission: "cashier_operations"
      },
      {
        title: "GL Posting Summary",
        url: "/cashier/gl-posting",
        icon: TrendingUp,
        requiresPermission: "cashier_supervisor"
      }
    ]
  },
  {
    title: "Reports",
    icon: BarChart3,
    subItems: [
      {
        title: "Cashier Reports",
        url: "/cashier/reports",
        icon: FileText,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Check Register",
        url: "/cashier/check-register",
        icon: CheckSquare,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Reconciliation Reports",
        url: "/cashier/reconciliation",
        icon: Calculator,
        requiresPermission: "cashier_supervisor"
      },
      {
        title: "Levy Collection Reports",
        url: "/cashier/levy-reports",
        icon: TrendingUp,
        requiresPermission: "cashier_supervisor"
      },
      {
        title: "Payment Analytics",
        url: "/cashier/analytics",
        icon: BarChart3,
        requiresPermission: "admin"
      }
    ]
  },
  {
    title: "Sage Integrations",
    icon: Settings,
    subItems: [
      {
        title: "Chart of Accounts Mapping",
        url: "/cashier/chart-accounts-mapping",
        icon: FileText,
        requiresPermission: "admin"
      },
      {
        title: "Payment Types Mapping",
        url: "/cashier/payment-types-mapping",
        icon: Calculator,
        requiresPermission: "admin"
      },
      {
        title: "Sage Synchronization",
        url: "/cashier/sage-sync",
        icon: Settings,
        requiresPermission: "admin"
      }
    ]
  },
  {
    title: "Bank Account Mapping",
    icon: Building,
    subItems: [
      {
        title: "Current Accounts Setup",
        url: "/cashier/current-accounts",
        icon: Banknote,
        requiresPermission: "admin"
      },
      {
        title: "Bank Reconciliation Accounts",
        url: "/cashier/reconciliation-accounts",
        icon: CheckSquare,
        requiresPermission: "admin"
      }
    ]
  }
];