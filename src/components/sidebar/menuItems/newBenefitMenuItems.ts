/**
 * @deprecated Epic 0.2 (BN Navigation Foundation) — 2026-07-05
 * Legacy static menu file for the /newbenefit/* namespace. NOT wired into the
 * active sidebar. Live menu is driven by the `app_modules` table; canonical
 * staff routes live under /bn/*. Contributor/employer-facing entries are
 * INVESTIGATE — they must migrate to src/portals/* rather than /bn/*.
 * Do not import from this file in new code.
 * See docs/bn/BN_ROUTE_AND_MENU_CONSOLIDATION_PLAN.md.
 */
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
        url: "/newbenefit/application/sickness",
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
        requiresPermission: "system_administration",
        subItems: [
          {
            title: "Survivors' Rules - Deceased Eligibility",
            url: "/nbenefit/config/survivors/deceased-eligibility",
            requiresPermission: "system_administration"
          },
          {
            title: "Survivors' Rules - Dependant Types",
            url: "/nbenefit/config/survivors/dependant-types",
            requiresPermission: "system_administration"
          },
          {
            title: "Survivors' Rules - Duration Rules",
            url: "/nbenefit/config/survivors/duration-rules",
            requiresPermission: "system_administration"
          },
          {
            title: "Survivors' Rules - Share Allocation",
            url: "/nbenefit/config/survivors/share-allocation",
            requiresPermission: "system_administration"
          },
          {
            title: "Survivors' Rules - Case Cap",
            url: "/nbenefit/config/survivors/case-cap",
            requiresPermission: "system_administration"
          },
          {
            title: "Survivors' Rules - Ongoing Eligibility",
            url: "/nbenefit/config/survivors/ongoing-eligibility",
            requiresPermission: "system_administration"
          }
        ]
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