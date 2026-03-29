import {
  Database, Globe, MapPin, Eye, Heart, Mail, Users, Shield, Building2,
  Factory, UserCheck, Briefcase, Landmark, CreditCard, Wallet, Receipt,
  FileText, AlertTriangle, Percent, Settings, Layers, CheckSquare
} from "lucide-react";

export const masterDataMenuItems = [
  {
    title: "Master Data",
    icon: Database,
    subItems: [
      // General
      { title: "Activity Types", url: "/admin/master-data/activity-types", icon: Layers, requiresPermission: "master_data" },
      { title: "Countries", url: "/admin/master-data/countries", icon: Globe, requiresPermission: "master_data" },
      { title: "Districts", url: "/admin/master-data/districts", icon: MapPin, requiresPermission: "master_data" },
      { title: "Eye Colors", url: "/admin/master-data/eye-colors", icon: Eye, requiresPermission: "master_data" },
      { title: "Marital Status", url: "/admin/master-data/marital-status", icon: Heart, requiresPermission: "master_data" },
      { title: "Postal Districts", url: "/admin/master-data/postal-districts", icon: Mail, requiresPermission: "master_data" },
      { title: "Relations", url: "/admin/master-data/relations", icon: Users, requiresPermission: "master_data" },
      { title: "Dependent Relations", url: "/admin/master-data/dependent-relations", icon: Users, requiresPermission: "master_data" },
      { title: "Sectors", url: "/admin/master-data/sectors", icon: Building2, requiresPermission: "master_data" },
      { title: "Verification Types", url: "/admin/master-data/verification-types", icon: CheckSquare, requiresPermission: "master_data" },
      { title: "Villages", url: "/admin/master-data/villages", icon: MapPin, requiresPermission: "master_data" },
      { title: "Legal Status", url: "/admin/master-data/legal-status", icon: Shield, requiresPermission: "master_data" },
      // Employment
      { title: "Industries", url: "/admin/master-data/industries", icon: Factory, requiresPermission: "master_data" },
      { title: "Inspectors", url: "/admin/master-data/inspectors", icon: UserCheck, requiresPermission: "master_data" },
      { title: "Occupations", url: "/admin/master-data/occupations", icon: Briefcase, requiresPermission: "master_data" },
      // Financial
      { title: "Bank Codes", url: "/admin/master-data/bank-codes", icon: Landmark, requiresPermission: "master_data" },
      { title: "Merchants", url: "/admin/master-data/merchants", icon: CreditCard, requiresPermission: "master_data" },
      { title: "Methods of Payment", url: "/admin/master-data/methods-of-payment", icon: Wallet, requiresPermission: "master_data" },
      { title: "Payer Types", url: "/admin/master-data/payer-types", icon: Users, requiresPermission: "master_data" },
      { title: "Payment Sources", url: "/admin/master-data/payment-sources", icon: Wallet, requiresPermission: "master_data" },
      { title: "Payment Types", url: "/admin/master-data/payment-types", icon: Wallet, requiresPermission: "master_data" },
      { title: "Receipt Status", url: "/admin/master-data/receipt-status", icon: Receipt, requiresPermission: "master_data" },
      { title: "Invoice Status", url: "/admin/master-data/invoice-status", icon: FileText, requiresPermission: "master_data" },
      { title: "Invoice Types", url: "/admin/master-data/invoice-types", icon: FileText, requiresPermission: "master_data" },
      { title: "Penalty Rates", url: "/admin/master-data/penalty-rates", icon: AlertTriangle, requiresPermission: "master_data" },
      { title: "SSC Rates", url: "/admin/master-data/ssc-rates", icon: Percent, requiresPermission: "master_data" },
      // C3 & Contributions
      { title: "Batch Status", url: "/admin/master-data/batch-status", icon: Settings, requiresPermission: "master_data" },
      { title: "C3 Status", url: "/admin/master-data/c3-status", icon: Settings, requiresPermission: "master_data" },
      { title: "VC Contrib Rates", url: "/admin/master-data/vc-contrib-rates", icon: Percent, requiresPermission: "master_data" },
      { title: "VC Eligibility Config", url: "/admin/master-data/vc-eligibility-config", icon: Settings, requiresPermission: "master_data" },
      // Existing
      { title: "Income Categories", url: "/admin/master-data/income-categories", icon: Layers, requiresPermission: "master_data" },
      { title: "Income Codes", url: "/admin/master-data/income-codes", icon: Layers, requiresPermission: "master_data" },
    ]
  }
];
