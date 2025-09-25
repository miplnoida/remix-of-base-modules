import { 
  CreditCard, 
  Calculator, 
  FileText, 
  Settings, 
  BarChart3,
  Receipt,
  Banknote
} from "lucide-react";

export const cashierMenuItems = [
  {
    title: "Cashier & Payments",
    icon: CreditCard,
    subItems: [
      {
        title: "Miscellaneous Payments",
        url: "/cashier/misc-payments",
        icon: Receipt,
        requiresPermission: "cashier_operations"
      },
      {
        title: "C3 Contributions",
        url: "/cashier/c3-payments",
        icon: Banknote,
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
        title: "Batch Management",
        url: "/cashier/batch-management",
        icon: Calculator,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Check Management",
        url: "/cashier/check-management",
        icon: FileText,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Cashier Reports",
        url: "/cashier/reports",
        icon: FileText,
        requiresPermission: "cashier_reports"
      },
      {
        title: "Payment Analytics",
        url: "/cashier/analytics",
        icon: BarChart3,
        requiresPermission: "cashier_reports"
      },
      {
        title: "Receipt Preview",
        url: "/cashier/receipt",
        icon: Receipt,
        requiresPermission: "cashier_operations"
      }
    ]
  }
];