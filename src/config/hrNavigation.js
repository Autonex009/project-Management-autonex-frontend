import {
  LayoutGrid,
  UserPlus,
  Workflow,
  Users2,
  CalendarDays,
  Target,
  ShieldCheck,
  CalendarCheck2,
} from "lucide-react";

/**
 * Navigation items for the HR Operations sidebar.
 * Mirrors the modern icon set of config/navigation.js (Admin portal).
 */
export const hrNavigation = [
  { name: "Dashboard", href: "/hr/dashboard", icon: LayoutGrid },
  { name: "Signup Requests", href: "/hr/signup-requests", icon: UserPlus },
  { name: "Onboarding Pipeline", href: "/hr/onboarding-pipeline", icon: Workflow },
  { name: "Employees", href: "/hr/employees", icon: Users2 },
  { name: "Leave Queue", href: "/hr/leaves", icon: CalendarDays },
  { name: "Performance", href: "/hr/performance", icon: Target },
  { name: "Weekly Comp", href: "/hr/weekly-compensation", icon: CalendarCheck2 },
  { name: "Activity Log", href: "/hr/activity-log", icon: ShieldCheck },
];
