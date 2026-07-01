
import { 
  FolderOpen, 
  FileText, 
  FileSpreadsheet
} from "lucide-react";

export const documentMenuItems = [
  {
    title: "Document Management",
    icon: FolderOpen,
    subItems: [
      {
        title: "Document Archive",
        url: "/documents/archive",
        icon: FolderOpen,
        requiresPermission: "manage_documents"
      },
      {
        title: "Template Management",
        url: "/admin/notification-templates?tab=core&type=PDF",
        icon: FileText,
        requiresPermission: "manage_documents"
      },
      {
        title: "Digital Signatures",
        url: "/documents/signatures",
        icon: FileSpreadsheet,
        requiresPermission: "manage_documents"
      }
    ]
  }
];
