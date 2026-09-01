import {
  LayoutDashboard,
  UserPlus,
  Calendar,
  Users,
  Star,
  History,
} from "lucide-react";

/**
 * Navigation items for the HR Operations sidebar.
 * Mirrors the structure of config/navigation.js (Admin portal).
 */
export const hrNavigation = [
  { name: "Dashboard", href: "/hr/dashboard", icon: LayoutDashboard },
  { name: "Signup Requests", href: "/hr/signup-requests", icon: UserPlus },
  { name: "Onboarding Pipeline", href: "/hr/onboarding-pipeline", icon: UserPlus },
  { name: "Employees", href: "/hr/employees", icon: Users },
  { name: "Leave Queue", href: "/hr/leaves", icon: Calendar },
  { name: "Performance", href: "/hr/performance", icon: Star },
  { name: "Activity Log", href: "/hr/activity-log", icon: History },
];
