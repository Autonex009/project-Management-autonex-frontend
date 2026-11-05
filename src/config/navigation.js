import {
  LayoutGrid,
  FolderKanban,
  TrendingUp,
  Users2,
  CalendarCheck,
  CalendarCheck2,
  UserPlus,
  Workflow,
  CalendarDays,
  Target,
  IndianRupee,
  Trophy,
  Gift,
  BookOpen,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  FileSpreadsheet,
  Settings,
} from "lucide-react";

/**
 * Grouped navigation structure for Admin portal (Linear style).
 * Supports role-based visibility via optional `roles` array on items.
 */
export const adminNavigationGroups = [
  {
    id: "main",
    title: "Main Menu",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutGrid },
      { name: "Projects", href: "/admin/sub-projects", icon: FolderKanban },
      { name: "Analytics", href: "/admin/analytics", icon: TrendingUp },
    ],
  },
  {
    id: "workforce",
    title: "Workforce",
    items: [
      { name: "Employees", href: "/admin/employees", icon: Users2 },
      { name: "Check-ins", href: "/admin/checkins", icon: CalendarCheck },
      { name: "Signup Requests", href: "/admin/signup-requests", icon: UserPlus },
      { name: "Allocations", href: "/admin/allocations", icon: Workflow },
      { name: "Leaves", href: "/admin/leaves", icon: CalendarDays },
    ],
  },
  {
    id: "performance-payroll",
    title: "Performance & Payroll",
    items: [
      { name: "Performance", href: "/admin/performance", icon: Target },
      { name: "Weekly Comp", href: "/admin/weekly-compensation", icon: CalendarCheck2 },
      { name: "Payroll", href: "/admin/payroll", icon: IndianRupee },
      { name: "Leaderboard", href: "/admin/leaderboard", icon: Trophy, roles: ["admin"] },
    ],
  },
  {
    id: "organization",
    title: "Organization",
    items: [
      { name: "Referrals", href: "/admin/referrals", icon: Gift },
      { name: "Guidelines", href: "/admin/guidelines", icon: BookOpen },
      { name: "Audit Log", href: "/admin/change-log", icon: ShieldCheck, roles: ["admin"] },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    items: [
      { name: "Training Modules", href: "/admin/modules", icon: GraduationCap },
      { name: "Newly Onboarded", href: "/admin/newly-onboarded", icon: Sparkles },
      { name: "Progress Reports", href: "/admin/onboarding-reports", icon: FileSpreadsheet },
    ],
  },
];

// Flat export of all navigation items for backwards compatibility and route resolution
export const navigation = [
  ...adminNavigationGroups.flatMap((group) => group.items),
  { name: "Company Settings", href: "/admin/company-settings", icon: Settings },
];
