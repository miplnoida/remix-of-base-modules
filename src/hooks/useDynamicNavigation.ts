import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { logError as logSystemError, logTechnical } from '@/services/systemLoggerService';
import { 
  LayoutDashboard, Users, Settings, Shield, Building2, FileText,
  ClipboardList, ClipboardCheck, Bell, Key, UserCog, Briefcase, FolderTree,
  Database, Lock, Activity, Calendar, ChartBar, Home, Layers,
  Settings2, Boxes, PenTool, Mail, Building, CheckCircle, FileCheck,
  AlertTriangle, DollarSign, CreditCard, Receipt, Wallet, TrendingUp,
  PieChart, BarChart2, UserPlus, UserCheck, FilePlus, Search,
  Monitor, FileCode, History, Link, GitBranch, Globe, Stethoscope,
  BellRing, Send, TestTube, FlaskConical, Terminal, MapPin, HardHat,
  Heart, Flag, BadgeCheck, Network, Workflow, Play, Eye, Plug, 
  ArrowLeftRight, ShieldAlert, ShieldCheck, Wrench, BarChart3,
  Clock, Target, FileBarChart,
  type LucideIcon
} from 'lucide-react';

export interface MenuItem {
  id: string;
  title: string;
  url?: string;
  icon: LucideIcon;
  description?: string;
  subItems?: MenuItem[];
}

interface ModuleRow {
  id: string;
  name: string;
  display_name: string;
  icon: string | null;
  route: string | null;
  parent_id: string | null;
  sort_order: number | null;
  description: string | null;
}

// Map of icon names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'layoutdashboard': LayoutDashboard,
  'dashboard': LayoutDashboard,
  'users': Users,
  'settings': Settings,
  'settings2': Settings2,
  'shield': Shield,
  'shieldcheck': ShieldCheck,
  'shield-check': ShieldCheck,
  'shieldalert': ShieldAlert,
  'shield-alert': ShieldAlert,
  'building': Building,
  'building2': Building2,
  'file-text': FileText,
  'filetext': FileText,
  'clipboard-list': ClipboardList,
  'clipboardlist': ClipboardList,
  'clipboardcheck': ClipboardCheck,
  'clipboard-check': ClipboardCheck,
  'bell': Bell,
  'bellring': BellRing,
  'bell-ring': BellRing,
  'key': Key,
  'user-cog': UserCog,
  'usercog': UserCog,
  'briefcase': Briefcase,
  'folder-tree': FolderTree,
  'foldertree': FolderTree,
  'database': Database,
  'lock': Lock,
  'activity': Activity,
  'calendar': Calendar,
  'chart-bar': ChartBar,
  'chartbar': ChartBar,
  'barchart3': BarChart3,
  'bar-chart-3': BarChart3,
  'home': Home,
  'layers': Layers,
  'boxes': Boxes,
  'pentool': PenTool,
  'pen-tool': PenTool,
  'mail': Mail,
  'send': Send,
  'checkcircle': CheckCircle,
  'check-circle': CheckCircle,
  'filecheck': FileCheck,
  'file-check': FileCheck,
  'alerttriangle': AlertTriangle,
  'alert-triangle': AlertTriangle,
  'dollarsign': DollarSign,
  'dollar-sign': DollarSign,
  'creditcard': CreditCard,
  'credit-card': CreditCard,
  'receipt': Receipt,
  'wallet': Wallet,
  'trendingup': TrendingUp,
  'trending-up': TrendingUp,
  'piechart': PieChart,
  'pie-chart': PieChart,
  'barchart2': BarChart2,
  'bar-chart-2': BarChart2,
  'userplus': UserPlus,
  'user-plus': UserPlus,
  'usercheck': UserCheck,
  'user-check': UserCheck,
  'fileplus': FilePlus,
  'file-plus': FilePlus,
  'search': Search,
  'monitor': Monitor,
  'filecode': FileCode,
  'file-code': FileCode,
  'history': History,
  'link': Link,
  'gitbranch': GitBranch,
  'git-branch': GitBranch,
  'globe': Globe,
  'stethoscope': Stethoscope,
  'testtube': TestTube,
  'test-tube': TestTube,
  'flaskconical': FlaskConical,
  'flask-conical': FlaskConical,
  'terminal': Terminal,
  'mappin': MapPin,
  'map-pin': MapPin,
  'hardhat': HardHat,
  'hard-hat': HardHat,
  'heart': Heart,
  'flag': Flag,
  'badgecheck': BadgeCheck,
  'badge-check': BadgeCheck,
  'network': Network,
  'workflow': Workflow,
  'play': Play,
  'eye': Eye,
  'plug': Plug,
  'arrowleftright': ArrowLeftRight,
  'arrow-left-right': ArrowLeftRight,
  'wrench': Wrench,
  'rows3': Layers,
  'clock': Clock,
  'target': Target,
  'filebarchart': FileBarChart,
  'file-bar-chart': FileBarChart,
};

// Map icon name string to Lucide icon component
function getIcon(iconName: string | null): LucideIcon {
  if (!iconName) return LayoutDashboard;
  
  const normalizedName = iconName.toLowerCase().replace(/[_\s]/g, '-');
  return iconMap[normalizedName] || iconMap[normalizedName.replace(/-/g, '')] || LayoutDashboard;
}

// Build hierarchical menu from flat module list
function buildMenuTree(modules: ModuleRow[]): MenuItem[] {
  const moduleMap = new Map<string, ModuleRow>();
  const childrenMap = new Map<string, ModuleRow[]>();
  const rootModules: ModuleRow[] = [];

  // First pass: organize modules
  modules.forEach(module => {
    moduleMap.set(module.id, module);

    if (module.parent_id) {
      const siblings = childrenMap.get(module.parent_id) || [];
      siblings.push(module);
      childrenMap.set(module.parent_id, siblings);
    } else {
      rootModules.push(module);
    }
  });

  // Sort by sort_order
  const sortModules = (a: ModuleRow, b: ModuleRow) =>
    (a.sort_order ?? 999) - (b.sort_order ?? 999);

  // Recursive function to build menu items
  function buildMenuItem(module: ModuleRow): MenuItem {
    const children = childrenMap.get(module.id) || [];
    children.sort(sortModules);

    const menuItem: MenuItem = {
      id: module.id,
      title: module.display_name,
      icon: getIcon(module.icon),
      description: module.description || undefined,
    };

    if (module.route) {
      menuItem.url = module.route;
    }

    if (children.length > 0) {
      menuItem.subItems = children.map(buildMenuItem);
    }

    return menuItem;
  }

  // Build the tree starting from root modules
  rootModules.sort(sortModules);
  return rootModules.map(buildMenuItem);
}

// ── Internal Audit: workflow-based group definitions ──
interface IAGroupDef {
  groupTitle: string;
  icon: LucideIcon;
  /** Route paths that belong to this group (matched against child.url) */
  paths: string[];
}

const IA_WORKFLOW_GROUPS: IAGroupDef[] = [
  {
    groupTitle: 'Dashboard',
    icon: LayoutDashboard,
    paths: ['/audit/dashboard'],
  },
  {
    groupTitle: 'Risk Management',
    icon: Shield,
    paths: ['/audit/risk-assessment', '/audit/risk-matrix'],
  },
  {
    groupTitle: 'Audit Planning',
    icon: ClipboardCheck,
    paths: ['/audit/audit-plans', '/audit/plan-approval'],
  },
  {
    groupTitle: 'Audit Execution',
    icon: Briefcase,
    paths: ['/audit/audits'],
  },
  {
    groupTitle: 'Resource Management',
    icon: Users,
    paths: [
      '/audit/auditors', '/audit/auditor-profiles',
      '/audit/workload',
      '/audit/time-tracking',
      '/audit/leave',
      '/audit/holidays',
    ],
  },
  {
    groupTitle: 'Master Data',
    icon: Database,
    paths: ['/audit/departments', '/audit/functions', '/audit/templates'],
  },
  {
    groupTitle: 'Reporting',
    icon: FileBarChart,
    paths: ['/audit/audit-reports'],
  },
  {
    groupTitle: 'Configuration',
    icon: Settings,
    paths: ['/audit/config', '/audit/risk-settings'],
  },
  {
    groupTitle: 'Admin',
    icon: Terminal,
    paths: ['/db-diagram/internal_audit'],
  },
];

// Display overrides for individual items (icon, title, description)
const IA_ITEM_OVERRIDES: Record<string, { title?: string; icon?: LucideIcon; description?: string }> = {
  '/audit/dashboard':        { title: 'Dashboard',               icon: LayoutDashboard, description: 'Audit overview and KPIs' },
  '/audit/risk-assessment':  { title: 'Risk Assessment',         icon: Shield,          description: 'Assess function-level risks' },
  '/audit/risk-matrix':      { title: 'Risk Matrix',             icon: BarChart3,       description: 'View the 5×5 risk heatmap' },
  '/audit/audit-plans':      { title: 'Audit Plan',              icon: ClipboardList,   description: 'Create risk-driven audit plans' },
  '/audit/plan-approval':    { title: 'Plan Approval',           icon: ClipboardCheck,  description: 'Review and approve submitted plans' },
  '/audit/audits':           { title: 'Audits',                  icon: Briefcase,       description: 'Execute audits for department functions' },
  '/audit/auditors':         { title: 'Auditor Profiles',        icon: UserCheck,       description: 'Manage auditor registry and roles' },
  '/audit/auditor-profiles': { title: 'Auditor Profiles',        icon: UserCheck,       description: 'Manage auditor registry and roles' },
  '/audit/workload':         { title: 'Workload & Capacity',     icon: BarChart3,       description: 'View auditor workload and capacity' },
  '/audit/time-tracking':    { title: 'Time Tracking',           icon: Clock,           description: 'Track audit time spent' },
  '/audit/leave':            { title: 'Leave & Vacation',        icon: Calendar,        description: 'Manage auditor leave schedules' },
  '/audit/holidays':         { title: 'Holiday Calendar',        icon: Flag,            description: 'Public holidays and non-working days' },
  '/audit/departments':      { title: 'Departments',             icon: Building2,       description: 'Manage department information' },
  '/audit/functions':        { title: 'Functions',               icon: FolderTree,      description: 'Manage department functions' },
  '/audit/templates':        { title: 'Templates',               icon: FileText,        description: 'Manage audit templates' },
  '/audit/audit-reports':    { title: 'Reports',                 icon: FileBarChart,    description: 'Generate audit reports' },
  '/audit/config':           { title: 'System Configuration',    icon: Settings,        description: 'Workflow defaults, notifications, SLA' },
  '/audit/risk-settings':    { title: 'Risk Configuration',      icon: Shield,          description: 'Likelihood, impact, formula, rating bands' },
  '/db-diagram/internal_audit': { title: 'DB Diagram',           icon: Database,        description: 'Internal Audit database schema' },
};

function normalizePath(path?: string): string {
  if (!path) return '';
  return path.trim().replace(/\/+$/, '') || '/';
}

function groupInternalAuditNavigation(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    const isInternalAuditRoot = item.title.toLowerCase() === 'internal audit';
    const children = item.subItems || [];

    if (!isInternalAuditRoot || children.length === 0) return item;

    // Apply display overrides to each child
    const enhanced = children.map((child) => {
      const norm = normalizePath(child.url);
      const ov = IA_ITEM_OVERRIDES[norm];
      if (ov) {
        return {
          ...child,
          title: ov.title ?? child.title,
          icon: ov.icon ?? child.icon,
          description: child.description || ov.description,
        } as MenuItem;
      }
      return child;
    });

    // Build a set of paths already claimed by groups
    const claimedPaths = new Set<string>();
    IA_WORKFLOW_GROUPS.forEach(g => g.paths.forEach(p => claimedPaths.add(normalizePath(p))));

    // Create grouped sub-menus
    const groupedItems: MenuItem[] = [];

    IA_WORKFLOW_GROUPS.forEach((group) => {
      const pathSet = new Set(group.paths.map(normalizePath));
      const members = enhanced.filter(c => c.url && pathSet.has(normalizePath(c.url)));

      if (members.length === 0) return;

      // If only 1 member AND group title matches item title, flatten to direct link
      if (members.length === 1 && members[0].title === group.groupTitle) {
        groupedItems.push(members[0]);
      } else {
        groupedItems.push({
          id: `ia-group-${group.groupTitle.toLowerCase().replace(/\s+/g, '-')}`,
          title: group.groupTitle,
          icon: group.icon,
          subItems: members,
        });
      }
    });

    // Add any unclaimed enabled children at the end
    const unclaimed = enhanced.filter(c => !c.url || !claimedPaths.has(normalizePath(c.url)));
    unclaimed.forEach(c => groupedItems.push(c));

    return { ...item, subItems: groupedItems };
  });
}

export function useDynamicNavigation() {
  const { user, isAdmin } = useSupabaseAuth();

  const {
    data: menuItems = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['dynamic-navigation', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const startTime = performance.now();
      
      // Call the RPC function using raw SQL to avoid type issues
      const { data, error } = await supabase
        .rpc('get_user_accessible_modules' as any, { _user_id: user.id });

      const executionTime = Math.round(performance.now() - startTime);

      if (error) {
        console.error('Failed to fetch accessible modules:', error);
        
        // Log the API error to system_error_logs
        await logSystemError({
          api_name: 'get_user_accessible_modules',
          module: 'Navigation',
          error_type: error.code || 'API_ERROR',
          error_message: error.message,
          stack_trace: error.details ? JSON.stringify({ details: error.details, hint: error.hint }) : undefined,
          severity: 'error',
          payload_json: { user_id: user.id, error_code: error.code },
        }, user.id);

        // Also log as technical log with failed status
        await logTechnical({
          api_name: 'get_user_accessible_modules',
          module: 'Navigation',
          execution_time_ms: executionTime,
          status: 'failed',
          severity: 'error',
          request_payload: { user_id: user.id },
          response_payload: { error: error.message, code: error.code },
        }, user.id);

        throw error;
      }

      // Log successful API call
      await logTechnical({
        api_name: 'get_user_accessible_modules',
        module: 'Navigation',
        execution_time_ms: executionTime,
        status: 'success',
        severity: 'info',
      }, user.id);

      return groupInternalAuditNavigation(buildMenuTree((data as ModuleRow[]) || []));
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const isEmpty = !isLoading && !isError && menuItems.length === 0;

  return {
    menuItems,
    isLoading,
    isError,
    isEmpty,
    isAdmin,
    error,
    refetch
  };
}

// Hook to check if user can access a specific module
export function useCanAccessModule(moduleName: string) {
  const { user, isAdmin } = useSupabaseAuth();

  const { data: canAccess = false, isLoading } = useQuery({
    queryKey: ['can-access-module', user?.id, moduleName],
    queryFn: async () => {
      if (!user?.id) return false;
      if (isAdmin) return true;

      const startTime = performance.now();
      
      const { data, error } = await supabase
        .rpc('can_access_module' as any, { 
          _user_id: user.id, 
          _module_name: moduleName 
        });

      const executionTime = Math.round(performance.now() - startTime);

      if (error) {
        console.error('Failed to check module access:', error);
        
        // Log the API error
        await logSystemError({
          api_name: 'can_access_module',
          module: 'Authorization',
          error_type: error.code || 'API_ERROR',
          error_message: error.message,
          stack_trace: error.details ? JSON.stringify({ details: error.details, hint: error.hint }) : undefined,
          severity: 'error',
          payload_json: { user_id: user.id, module_name: moduleName, error_code: error.code },
        }, user.id);

        await logTechnical({
          api_name: 'can_access_module',
          module: 'Authorization',
          execution_time_ms: executionTime,
          status: 'failed',
          severity: 'error',
        }, user.id);

        return false;
      }

      return (data as boolean) ?? false;
    },
    enabled: !!user?.id && !!moduleName,
    staleTime: 5 * 60 * 1000,
  });

  return { canAccess, isLoading, isAdmin };
}
