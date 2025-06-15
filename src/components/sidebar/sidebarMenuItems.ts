import {
  Building2,
  Users,
  CreditCard,
  FileText,
  ShieldCheck,
  BarChart3,
  FolderOpen,
  Settings,
  Home,
  UserPlus,
  Briefcase,
  Heart,
  AlertTriangle,
  PieChart,
  Calendar,
  Download,
  ChevronDown,
  ChevronRight,
  Upload,
  CheckCircle,
  Baby,
  BriefcaseIcon,
  Wrench,
  Skull,
  GraduationCap,
} from "lucide-react";

export const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Employer Management",
    icon: Building2,
    subItems: [
      { title: "Employer Registration", url: "/employer/register", icon: UserPlus },
      { title: "Employer Approval", url: "/employer/approval", icon: CheckCircle, requiresPermission: "manage_employers" },
      { title: "Employer Directory", url: "/employer/directory", icon: Users },
      { title: "Contribution Entry", url: "/employer/contribution-entry", icon: Upload },
      { title: "Compliance Monitoring", url: "/employer/compliance", icon: AlertTriangle },
      { title: "Contribution Tracking", url: "/employer/contributions", icon: BarChart3 },
    ],
  },
  {
    title: "Insured Persons",
    icon: Users,
    subItems: [
      { title: "Person Registration", url: "/person/register", icon: UserPlus },
      { title: "Person Approval", url: "/person/approval", icon: CheckCircle, requiresPermission: "manage_persons" },
      { title: "Person Directory", url: "/person/directory", icon: Users },
      { title: "ID Card Generation", url: "/person/id-cards", icon: CreditCard },
      { title: "Biometric Data", url: "/person/biometrics", icon: ShieldCheck },
    ],
  },
  {
    title: "Benefits Management",
    icon: Heart,
    subItems: [
      { title: "Claims Processing", url: "/benefits/claims", icon: FileText },
      { title: "Pension Management", url: "/benefits/pension", icon: Calendar },
      { title: "Medical Benefits", url: "/benefits/medical", icon: Heart },
      { title: "Disability Benefits", url: "/benefits/disability", icon: ShieldCheck },
      { title: "Maternity Benefits", url: "/benefits/maternity", icon: Baby },
      { title: "Unemployment Benefits", url: "/benefits/unemployment", icon: BriefcaseIcon },
      { title: "Work Injury Benefits", url: "/benefits/work-injury", icon: Wrench },
      { title: "Death Benefits", url: "/benefits/death", icon: Skull },
      { title: "Educational Benefits", url: "/benefits/educational", icon: GraduationCap },
      { title: "All Benefits", url: "/benefits/all", icon: Heart },
    ],
  },
  {
    title: "Compliance & Audit",
    icon: ShieldCheck,
    subItems: [
      { title: "Compliance Dashboard", url: "/compliance/dashboard", icon: BarChart3 },
      { title: "Audit Trails", url: "/compliance/audit", icon: FileText },
      { title: "Violations", url: "/compliance/violations", icon: AlertTriangle },
      { title: "Inspections", url: "/compliance/inspections", icon: ShieldCheck },
    ],
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    subItems: [
      { title: "Financial Reports", url: "/reports/financial", icon: PieChart },
      { title: "Statistical Reports", url: "/reports/statistical", icon: BarChart3 },
      { title: "Operational Reports", url: "/reports/operational", icon: FileText },
      { title: "Custom Reports", url: "/reports/custom", icon: Settings },
    ],
  },
  {
    title: "Document Management",
    icon: FolderOpen,
    subItems: [
      { title: "Document Repository", url: "/documents/repository", icon: FolderOpen },
      { title: "Digital Archives", url: "/documents/archives", icon: FileText },
      { title: "Document Templates", url: "/documents/templates", icon: Download },
      { title: "Bulk Operations", url: "/documents/bulk", icon: Settings },
    ],
  },
  {
    title: "System Administration",
    icon: Settings,
    subItems: [
      { title: "User Management", url: "/admin/users", icon: Users },
      { title: "System Settings", url: "/admin/settings", icon: Settings },
      { title: "Security Settings", url: "/admin/security", icon: ShieldCheck },
      { title: "Backup & Recovery", url: "/admin/backup", icon: Download },
    ],
  },
];

// Export icons used for triggers if needed (ChevronDown, ChevronRight)
export { ChevronDown, ChevronRight };
