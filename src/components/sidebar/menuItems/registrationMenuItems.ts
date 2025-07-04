
import { 
  FileText, 
  BookOpen, 
  Users,
  CheckCircle,
  Building2
} from "lucide-react";

export const registrationMenuItems = [
  {
    title: "Registration Rules & Process",
    icon: BookOpen,
    subItems: [
      {
        title: "Insured Person Registration",
        url: "/registration/insured-person-guide",
        icon: Users,
        requiresPermission: "view_guidelines",
        description: "Step-by-step registration guide for citizens & non-citizens"
      },
      {
        title: "Employer Rules & Status",
        url: "/registration/employer-rules",
        icon: Building2,
        requiresPermission: "view_guidelines",
        description: "Active/Ceased employer rules and guidelines"
      },
      {
        title: "Approval Workflow",
        url: "/registration/approval-workflow",
        icon: CheckCircle,
        requiresPermission: "view_guidelines",
        description: "Internal approval workflow overview"
      },
      {
        title: "Documentation Requirements",
        url: "/registration/documentation",
        icon: FileText,
        requiresPermission: "view_guidelines",
        description: "Required documents for different registration types"
      }
    ]
  }
];
