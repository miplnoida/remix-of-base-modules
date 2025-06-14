
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
  const { collapsed } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const [openGroups, setOpenGroups] = useState<string[]>(['Dashboard']);

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
      <div className="p-4 border-b bg-blue-900 text-white">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-blue-200" />
          {!collapsed && (
            <div>
              <h2 className="font-bold text-lg">Social Security</h2>
              <p className="text-blue-200 text-sm">Management System</p>
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
                        className={`w-full justify-between hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                          isGroupActive(item.subItems) ? 'bg-blue-100 text-blue-700 font-medium' : ''
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
                                className={`hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                                  isActive(subItem.url) ? 'bg-blue-100 text-blue-700 font-medium border-r-2 border-blue-500' : ''
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
                    className={`hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                      isActive(item.url) ? 'bg-blue-100 text-blue-700 font-medium border-r-2 border-blue-500' : ''
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
