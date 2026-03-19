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

const SIMPLIFIED_INTERNAL_AUDIT_MENU: Array<{
  id: string;
  title: string;
  icon: LucideIcon;
  path: string;
  aliases: string[];
  description: string;
}> = [
  {
    id: 'ia-dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/audit/dashboard',
    aliases: ['/audit/dashboard'],
    description: 'Audit overview and KPIs',
  },
  {
    id: 'ia-departments',
    title: 'Departments',
    icon: Building2,
    path: '/audit/departments',
    aliases: ['/audit/departments'],
    description: 'Manage department information',
  },
  {
    id: 'ia-functions',
    title: 'Functions',
    icon: FolderTree,
    path: '/audit/functions',
    aliases: ['/audit/functions'],
    description: 'Manage department functions',
  },
  {
    id: 'ia-risk-assessment',
    title: 'Risk Assessment',
    icon: Shield,
    path: '/audit/risk-assessment',
    aliases: ['/audit/risk-assessment'],
    description: 'Assess function-level risks',
  },
  {
    id: 'ia-risk-matrix',
    title: 'Risk Matrix',
    icon: BarChart3,
    path: '/audit/risk-matrix',
    aliases: ['/audit/risk-matrix', '/audit/rcm'],
    description: 'View the 5×5 risk heatmap',
  },
  {
    id: 'ia-audit-plans',
    title: 'Audit Plan',
    icon: ClipboardList,
    path: '/audit/audit-plans',
    aliases: ['/audit/audit-plans', '/audit/plans'],
    description: 'Create risk-driven audit plans',
  },
  {
    id: 'ia-audits',
    title: 'Audits',
    icon: Briefcase,
    path: '/audit/audits',
    aliases: ['/audit/audits', '/audit/engagements'],
    description: 'Execute audits for department functions',
  },
  {
    id: 'ia-findings',
    title: 'Findings',
    icon: AlertTriangle,
    path: '/audit/findings',
    aliases: ['/audit/findings'],
    description: 'Record audit findings and issues',
  },
  {
    id: 'ia-actions',
    title: 'Action Tracker',
    icon: CheckCircle,
    path: '/audit/actions',
    aliases: ['/audit/actions'],
    description: 'Track remediation actions',
  },
  {
    id: 'ia-reports',
    title: 'Reports',
    icon: FileBarChart,
    path: '/audit/audit-reports',
    aliases: ['/audit/audit-reports', '/audit/reports'],
    description: 'Generate audit reports',
  },
];

function normalizePath(path?: string): string {
  if (!path) return '';
  return path.trim().replace(/\/+$/, '') || '/';
}

function groupInternalAuditNavigation(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    const isInternalAuditRoot = item.title.toLowerCase() === 'internal audit';
    const children = item.subItems || [];

    if (!isInternalAuditRoot || children.length === 0) return item;

    const childrenByPath = new Map(children.map((child) => [normalizePath(child.url), child]));

    const simplifiedChildren = SIMPLIFIED_INTERNAL_AUDIT_MENU.map((config) => {
      const matchedChild = config.aliases
        .map((alias) => childrenByPath.get(normalizePath(alias)))
        .find(Boolean);

      return {
        id: matchedChild?.id || config.id,
        title: config.title,
        url: config.path,
        icon: config.icon,
        description: matchedChild?.description || config.description,
        subItems: matchedChild?.subItems,
      } as MenuItem;
    });

    return {
      ...item,
      subItems: simplifiedChildren,
    };
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
