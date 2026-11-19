import {
  LayoutGrid,
  FolderKanban,
  Layers,
  TrendingUp,
  Users2,
  Workflow,
  CalendarCheck,
  CalendarDays,
  CalendarCheck2,
  Target,
  ClipboardList,
  IndianRupee,
  Trophy,
  Rocket,
  BookOpen,
  Gift,
  GraduationCap,
  Sparkles,
  Utensils,
} from "lucide-react";

/**
 * Grouped navigation structure for PM Portal (Linear style, matching Admin).
 */
export const pmNavigationGroups = [
  {
    id: "main",
    title: "Main Menu",
    items: [
      { name: "Dashboard", href: "/pm/dashboard", icon: LayoutGrid },
      { name: "Projects", href: "/pm/sub-projects", icon: FolderKanban },
      { name: "Organizations", href: "/pm/projects", icon: Layers },
      { name: "Analytics", href: "/pm/analytics", icon: TrendingUp },
    ],
  },
  {
    id: "workforce",
    title: "Workforce",
    items: [
      { name: "My Team", href: "/pm/my-team", icon: Users2 },
      { name: "Allocations", href: "/pm/allocations", icon: Workflow },
      { name: "Team Check-ins", href: "/pm/team-checkins", icon: CalendarCheck },
      { name: "Team Leaves", href: "/pm/leaves", icon: CalendarDays },
      { name: "My Leaves", href: "/pm/my-leaves", icon: CalendarCheck2 },
    ],
  },
  {
    id: "performance-payroll",
    title: "Performance & Growth",
    items: [
      { name: "Performance", href: "/pm/performance", icon: Target },
      { name: "Self Evaluation", href: "/pm/self-evaluation", icon: ClipboardList },
      { name: "Weekly Comp", href: "/pm/weekly-compensation", icon: IndianRupee },
      { name: "Leaderboard", href: "/pm/leaderboard", icon: Trophy },
    ],
  },
  {
    id: "organization",
    title: "Organization",
    items: [
      { name: "Side Projects", href: "/pm/side-projects", icon: Rocket },
      { name: "Guidelines", href: "/pm/guidelines", icon: BookOpen },
      { name: "Referrals", href: "/pm/referrals", icon: Gift },
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding & Learning",
    items: [
      { name: "My Onboarding", href: "/pm/onboarding", icon: GraduationCap },
      { name: "Mentorship", href: "/pm/onboarding-mentor", icon: Sparkles },
    ],
  },
];

export const getPmNavigationGroups = ({ canManageCanteen = false } = {}) => {
  if (!canManageCanteen) return pmNavigationGroups;

  return pmNavigationGroups.map((group) => {
    if (group.id !== "organization") return group;
    // Append Lunch Menu to organization group
    const hasLunchMenu = group.items.some((i) => i.href === "/pm/lunch-menu");
    if (hasLunchMenu) return group;
    return {
      ...group,
      items: [
        ...group.items,
        { name: "Lunch Menu", href: "/pm/lunch-menu", icon: Utensils },
      ],
    };
  });
};
