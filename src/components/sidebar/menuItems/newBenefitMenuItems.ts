import { 
  Heart, 
  Users, 
  Shield, 
  FileText,
  CreditCard,
  Calendar,
  Settings,
  BarChart3,
  Mail,
  UserCheck,
  Building,
  Stethoscope,
  Calculator,
  Award,
  DollarSign,
  Archive,
  Eye,
  Search
} from "lucide-react";

export const newBenefitMenuItems = [
  {
    title: "NewBenefit System",
    icon: Heart,
    subItems: [
      // Contributor Side
      {
        title: "Dashboard",
        url: "/newbenefit/dashboard",
        icon: BarChart3,
        requiresPermission: "view_own_profile"
      },
      {
        title: "Apply for Benefits",
        url: "/newbenefit/apply",
        icon: FileText,
        requiresPermission: "apply_for_benefits"
      },
      {
        title: "My Claims",
        url: "/newbenefit/my-claims",
        icon: CreditCard,
        requiresPermission: "view_own_claims"
      },
      {
        title: "Reports",
        url: "/newbenefit/reports",
        icon: BarChart3,
        requiresPermission: "view_own_claims"
      },
      {
        title: "Inbox",
        url: "/newbenefit/inbox",
        icon: Mail,
        requiresPermission: "view_inbox"
      },
      
      // Staff Side - Claims Processing
      {
        title: "Home/Worklists",
        url: "/newbenefit/worklists",
        icon: Users,
        requiresPermission: "view_claims"
      },
      {
        title: "Intake Console",
        url: "/newbenefit/intake",
        icon: FileText,
        requiresPermission: "process_claims"
      },
      {
        title: "Application Form",
        url: "/newbenefit/application/:benefitType",
        icon: FileText,
        requiresPermission: "apply_for_benefits"
      },
      {
        title: "Claim 360 View",
        url: "/newbenefit/claim-360",
        icon: Eye,
        requiresPermission: "view_claims"
      },
      
      // Medical Board
      {
        title: "Medical Board Hub",
        url: "/newbenefit/medical-board",
        icon: Stethoscope,
        requiresPermission: "schedule_medical_board"
      },
      
      // Employer Hub
      {
        title: "Employer Hub",
        url: "/newbenefit/employer-hub",
        icon: Building,
        requiresPermission: "verify_employment"
      },
      
      // Pension Administration
      {
        title: "Pension Administration",
        url: "/newbenefit/pension-admin",
        icon: Award,
        requiresPermission: "process_payments"
      },
      
      // Payments
      {
        title: "Payments Module",
        url: "/newbenefit/payments",
        icon: DollarSign,
        requiresPermission: "process_payments"
      },
      
      // Communications
      {
        title: "Letters & Communications",
        url: "/newbenefit/communications",
        icon: Mail,
        requiresPermission: "process_claims"
      },
      
      // Administration
      {
        title: "Admin & Config",
        url: "/newbenefit/admin",
        icon: Settings,
        requiresPermission: "system_administration"
      },
      
      // Auditor View
      {
        title: "Auditor View",
        url: "/newbenefit/auditor",
        icon: Search,
        requiresPermission: "view_audit_logs"
      }
    ]
  }
];