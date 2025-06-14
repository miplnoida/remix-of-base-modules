
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const menuItems = [
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
      { title: "Employer Directory", url: "/employer/directory", icon: Users },
      { title: "Compliance Monitoring", url: "/employer/compliance", icon: AlertTriangle },
      { title: "Contribution Tracking", url: "/employer/contributions", icon: BarChart3 },
    ],
  },
  {
    title: "Insured Persons",
    icon: Users,
    subItems: [
      { title: "Person Registration", url: "/person/register", icon: UserPlus },
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

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const [openGroups, setOpenGroups] = useState<string[]>(['Dashboard']);
  const { user, hasPermission } = useAuth();

  const toggleGroup = (title: string) => {
    setOpenGroups(prev => 
      prev.includes(title) 
        ? prev.filter(group => group !== title)
        : [...prev, title]
    );
  };

  const isActive = (path: string) => currentPath === path;
  const isGroupActive = (subItems: any[]) => 
    subItems?.some(item => isActive(item.url));

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-72"} transition-all duration-300 border-r bg-white shadow-lg`}>
      <div className="p-4 border-b bg-green-900 text-white">
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/990576b3-f8e5-48e9-a203-ee949d3d0ae0.png" 
            alt="SecureServe Logo" 
            className="h-8 w-8 bg-white rounded p-1"
          />
          {!collapsed && (
            <div>
              <h2 className="font-bold text-lg">SecureServe</h2>
              <p className="text-green-200 text-sm">Management System</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="p-0">
        <div className="p-4">
          <SidebarTrigger className="mb-4" />
        </div>

        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.subItems ? (
                  <Collapsible 
                    open={openGroups.includes(item.title)}
                    onOpenChange={() => toggleGroup(item.title)}
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        className={`w-full justify-between hover:bg-green-50 hover:text-green-700 transition-colors ${
                          isGroupActive(item.subItems) ? 'bg-green-100 text-green-700 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!collapsed && <span>{item.title}</span>}
                        </div>
                        {!collapsed && (
                          openGroups.includes(item.title) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton 
                                asChild
                                className={`hover:bg-green-50 hover:text-green-700 transition-colors ${
                                  isActive(subItem.url) ? 'bg-green-100 text-green-700 font-medium border-r-2 border-green-500' : ''
                                }`}
                              >
                                <NavLink to={subItem.url} className="flex items-center gap-3 pl-8">
                                  <subItem.icon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                ) : (
                  <SidebarMenuButton 
                    asChild
                    className={`hover:bg-green-50 hover:text-green-700 transition-colors ${
                      isActive(item.url) ? 'bg-green-100 text-green-700 font-medium border-r-2 border-green-500' : ''
                    }`}
                  >
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
