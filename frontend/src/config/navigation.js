import {
  Home,
  Users,
  Users2,
  Activity,
  Globe,
  LayoutDashboard,
  Mail,
  MessageSquare,
  CreditCard,
  GitBranch,
  Store,
  UserRoundX,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Download,
  FileCheck,
  Bell,
  Timer,
  UsersRound,
  Palette,
} from 'lucide-react';
import { ROUTE_PATHS } from '../routes/paths';
import { USER_ROLES } from '../utils/constants';

const ALL_ROLES = 'all';

function canAccess(user, roles) {
  if (!roles || roles === ALL_ROLES || roles.includes(ALL_ROLES)) return true;
  if (!user?.role) return false;
  return roles.includes(user.role);
}

export function isNavItemActive(pathname, href) {
  if (href === ROUTE_PATHS.LEADS) {
    return (
      pathname === ROUTE_PATHS.LEADS ||
      (pathname.startsWith('/leads/') &&
        !pathname.startsWith(ROUTE_PATHS.LEADS_COMPLETED) &&
        !pathname.startsWith(ROUTE_PATHS.LEADS_UNASSIGNED))
    );
  }
  return (
    pathname === href ||
    (href !== ROUTE_PATHS.DASHBOARD && pathname.startsWith(`${href}/`))
  );
}

export function isSettingsSectionActive(pathname) {
  return pathname.startsWith('/settings');
}

export function isTemplatesSectionActive(pathname) {
  return pathname.startsWith('/templates');
}

export function isLeadsSectionActive(pathname, leadsNav) {
  return leadsNav.some((item) => isNavItemActive(pathname, item.href));
}

export function getAbandonedNavigation(user) {
  if (user?.role !== USER_ROLES.ADMIN) return [];
  return [
    { name: 'Queues', href: ROUTE_PATHS.ABANDONED_QUEUE, icon: ShoppingCart, roles: [USER_ROLES.ADMIN] },
    { name: 'Settings', href: ROUTE_PATHS.ABANDONED_SETTINGS, icon: SlidersHorizontal, roles: [USER_ROLES.ADMIN] },
  ];
}

export function isAbandonedSectionActive(pathname, abandonedNav) {
  if (!pathname.startsWith('/abandoned')) return false;
  return abandonedNav.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function getMainNavigation(user) {
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  const canSeeMyTeam =
    !isAdmin &&
    (user?.role === USER_ROLES.TEAM_MANAGER || user?.role === USER_ROLES.TEAM_MEMBER);

  const items = [
    { name: 'Dashboard', href: ROUTE_PATHS.DASHBOARD, icon: Home, roles: [ALL_ROLES] },
    { name: 'Task Activities', href: ROUTE_PATHS.ACTIVITIES, icon: Activity, roles: [ALL_ROLES] },
  ];

  if (isAdmin) {
    items.splice(1, 0,
      { name: 'User Management', href: ROUTE_PATHS.USER_MANAGEMENT, icon: Users2, roles: [USER_ROLES.ADMIN] },
      { name: 'Teams', href: ROUTE_PATHS.TEAMS_SETTINGS, icon: Users, roles: [USER_ROLES.ADMIN] },
      { name: 'Seller Assignments', href: ROUTE_PATHS.SELLER_USERS, icon: Store, roles: [USER_ROLES.ADMIN] }
    );
  }

  if (canSeeMyTeam) {
    const insertAt = isAdmin ? 4 : 1;
    items.splice(insertAt, 0, {
      name: 'My team',
      href: ROUTE_PATHS.MY_TEAM,
      icon: UsersRound,
      roles: [USER_ROLES.TEAM_MANAGER, USER_ROLES.TEAM_MEMBER],
    });
  }

  return items.filter((item) => canAccess(user, item.roles));
}

export function getLeadsNavigation(user) {
  const isAdmin = user?.role === USER_ROLES.ADMIN;
  const canSeeUnassigned =
    isAdmin || user?.role === USER_ROLES.TEAM_MANAGER;

  const items = [
    { name: 'Lead Management', href: ROUTE_PATHS.LEADS, icon: Users, roles: [ALL_ROLES] },
    { name: 'Completed Leads', href: ROUTE_PATHS.LEADS_COMPLETED, icon: FileCheck, roles: [ALL_ROLES] },
  ];

  if (canSeeUnassigned) {
    items.push({
      name: 'Unassigned Leads',
      href: ROUTE_PATHS.LEADS_UNASSIGNED,
      icon: UserRoundX,
      roles: [USER_ROLES.ADMIN, USER_ROLES.TEAM_MANAGER],
    });
  }

  return items.filter((item) => canAccess(user, item.roles));
}

export function getSettingsSubNavigation() {
  return [
    { href: ROUTE_PATHS.SETTINGS_API_CONFIG, icon: Globe, label: 'Lead Sources' },
    { href: ROUTE_PATHS.SETTINGS_PAYMENT_METHODS, icon: CreditCard, label: 'Payment Methods' },
    { href: ROUTE_PATHS.SETTINGS_PIPELINES, icon: GitBranch, label: 'Pipelines & Stages' },
    { href: ROUTE_PATHS.SETTINGS_DASHBOARD_SECTIONS, icon: LayoutDashboard, label: 'Dashboard sections' },
    { href: ROUTE_PATHS.SETTINGS_BRANDING, icon: Palette, label: 'Sidebar branding' },
    { href: ROUTE_PATHS.SETTINGS_LEAD_ASSIGNMENT_STRATEGIES, icon: Sparkles, label: 'Assignment strategies' },
    { href: ROUTE_PATHS.SETTINGS_NOTIFICATIONS, icon: Bell, label: 'Notifications' },
    { href: ROUTE_PATHS.SETTINGS_CRONS, icon: Timer, label: 'Scheduled crons' },
  ];
}

export function getTemplatesSubNavigation() {
  return [
    { href: ROUTE_PATHS.TEMPLATES_EMAIL, icon: Mail, label: 'Email' },
    { href: ROUTE_PATHS.TEMPLATES_WHATSAPP, icon: MessageSquare, label: 'WhatsApp' },
  ];
}

export function getAdminShortcuts(user) {
  if (user?.role !== USER_ROLES.ADMIN) return [];

  return [
    { href: ROUTE_PATHS.SETTINGS_API_CONFIG, icon: Globe, title: 'API Config' },
    { href: ROUTE_PATHS.SETTINGS_PAYMENT_METHODS, icon: CreditCard, title: 'Payment Methods' },
    { href: ROUTE_PATHS.SETTINGS_PIPELINES, icon: GitBranch, title: 'Pipelines & Stages' },
    { href: ROUTE_PATHS.SETTINGS_DASHBOARD_SECTIONS, icon: LayoutDashboard, title: 'Dashboard sections' },
    { href: ROUTE_PATHS.SETTINGS_BRANDING, icon: Palette, title: 'Sidebar branding' },
    { href: ROUTE_PATHS.SETTINGS_LEAD_ASSIGNMENT_STRATEGIES, icon: Sparkles, title: 'Assignment strategies' },
    { href: ROUTE_PATHS.SETTINGS_NOTIFICATIONS, icon: Bell, title: 'Notifications' },
    { href: ROUTE_PATHS.SETTINGS_CRONS, icon: Timer, title: 'Scheduled crons' },
    { href: ROUTE_PATHS.TEMPLATES_EMAIL, icon: Mail, title: 'Email templates' },
    { href: ROUTE_PATHS.TEMPLATES_WHATSAPP, icon: MessageSquare, title: 'WhatsApp templates' },
    { href: ROUTE_PATHS.EXPORT_REPORTS, icon: Download, title: 'Export Reports' },
  ];
}

export function getExportReportsNavItem(user) {
  if (user?.role !== USER_ROLES.ADMIN) return null;
  return { name: 'Export Reports', href: ROUTE_PATHS.EXPORT_REPORTS, icon: Download };
}
