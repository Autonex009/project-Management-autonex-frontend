import {
  LayoutGrid,
  FolderKanban,
  CalendarDays,
  ClipboardList,
  Trophy,
  Rocket,
  BookOpen,
  Gift,
  Info,
  GraduationCap,
  ClipboardCheck,
  Utensils,
} from "lucide-react";

/**
 * Grouped navigation structure for Employee Portal (Linear style, matching PM/Admin).
 */
export const employeeNavigationGroups = [
  {
    id: "main",
    title: "Main Menu",
    items: [
      { name: "Dashboard", href: "/employee/dashboard", icon: LayoutGrid },
      { name: "My Projects", href: "/employee/projects", icon: FolderKanban },
      { name: "Leaves", href: "/employee/leaves", icon: CalendarDays },
    ],
  },
  {
    id: "performance",
    title: "Performance & Growth",
    items: [
      { name: "Self Evaluation", href: "/employee/self-evaluation", icon: ClipboardList },
      { name: "Leaderboard", href: "/employee/leaderboard", icon: Trophy },
    ],
  },
  {
    id: "organization",
    title: "Organization",
    items: [
      { name: "Side Projects", href: "/employee/side-projects", icon: Rocket },
      { name: "Guidelines", href: "/employee/guidelines", icon: BookOpen },
      { name: "Referrals", href: "/employee/referrals", icon: Gift },
      { name: "Company Info", href: "/employee/company-info", icon: Info },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding & Learning",
    items: [
      { name: "Onboarding", href: "/employee/onboarding", icon: GraduationCap },
      { name: "My Assessments", href: "/employee/assessments", icon: ClipboardCheck },
    ],
  },
];

export const getEmployeeNavigationGroups = ({ canManageCanteen = false } = {}) => {
  if (!canManageCanteen) return employeeNavigationGroups;

  return employeeNavigationGroups.map((group) => {
    if (group.id !== "organization") return group;
    if (group.items.some((i) => i.href === "/employee/lunch-menu")) return group;
    return {
      ...group,
      items: [
        ...group.items,
        { name: "Lunch Menu", href: "/employee/lunch-menu", icon: Utensils },
      ],
    };
  });
};
