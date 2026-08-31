import {
  Users,
  FolderKanban,
  Calendar,
  LayoutDashboard,
  UserCog,
  Layers,
  FileText,
  UserPlus,
  Users2,
  IndianRupee,
  Settings,
  Star,
  BarChart3,
  History,
  Trophy,
  ClipboardCheck,
} from "lucide-react";

// `roles`, when present, limits the item to those user roles. Omit it for items
// everyone in the admin layout may open.
export const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/admin/sub-projects", icon: FolderKanban },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Employees", href: "/admin/employees", icon: Users },
  { name: "Check-ins", href: "/admin/checkins", icon: ClipboardCheck },
  { name: "Signup Requests", href: "/admin/signup-requests", icon: UserPlus },
  { name: "Allocations", href: "/admin/allocations", icon: UserCog },
  { name: "Leaves", href: "/admin/leaves", icon: Calendar },
  { name: "Performance", href: "/admin/performance", icon: Star },
  { name: "Payroll", href: "/admin/payroll", icon: IndianRupee },
  { name: "Referrals", href: "/admin/referrals", icon: Users2 },
  { name: "Guidelines", href: "/admin/guidelines", icon: FileText },
  // Admin-only: the audit log spans payroll, salary and employee actions org-wide,
  // and the backend enforces the same restriction (see app/api/audit_logs.py).
  { name: "Audit Log", href: "/admin/change-log", icon: History, roles: ["admin"] },
  { name: "Leaderboard", href: "/admin/leaderboard", icon: Trophy, roles: ["admin"] },
  { name: "Company Settings", href: "/admin/company-settings", icon: Settings },
];
