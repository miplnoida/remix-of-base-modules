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
        title: "Payment Collection",
        url: "/cashier/payment-collection",
        icon: Receipt,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Batch Management",
        url: "/cashier/batch-management",
        icon: Calculator,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Cashier Reports",
        url: "/cashier/reports",
        icon: FileText,
        requiresPermission: "cashier_reports"
      },
      {
        title: "Day-End Balancing",
        url: "/cashier/balancing",
        icon: Banknote,
        requiresPermission: "cashier_supervisor"
      },
      {
        title: "Check Management",
        url: "/cashier/check-management",
        icon: FileText,
        requiresPermission: "cashier_operations"
      },
      {
        title: "Sage Integration",
        url: "/cashier/sage-integration",
        icon: Settings,
        requiresPermission: "system_admin"
      },
      {
        title: "Payment Analytics",
        url: "/cashier/analytics",
        icon: BarChart3,
        requiresPermission: "cashier_reports"
      }
    ]
  }
];