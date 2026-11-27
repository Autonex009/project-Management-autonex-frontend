/**
 * Training catalog placeholder dataset (Phase 2 LMS pending backend).
 * All assessment, cluster, candidate, and scorecard demo data has been removed
 * and replaced by live backend APIs (/api/assessments, /api/clusters, /api/assignments).
 */

export const INITIAL_OVERALL_REPORTS = [];

export const INITIAL_COURSES = [
  {
    id: "onboarding-core",
    title: "Onboarding Training Module",
    description: "Complete foundational onboarding program for new annotators covering platform orientation, annotation bay tools, precision guidelines, and rejected task workflows.",
    category: "New Joiner Onboarding",
    status: "Published",
    isPrimaryOnboarding: true,
    assignedClusters: ["Nov 2025 Onboarding Interns"],
    createdAt: "2026-11-01",
  },
  {
    id: "robotics-advanced",
    title: "Robotics & Sensor Fusion Training",
    description: "Advanced post-onboarding training for 3D bounding boxes, multi-camera tracking, LiDAR projection, and autonomous vehicle annotation.",
    category: "Specialized Role",
    status: "Published",
    isPrimaryOnboarding: false,
    modulesCount: 4,
    sectionsCount: 8,
    assignedClusters: ["Full-Time Annotators Q4"],
    createdAt: "2026-11-10",
  },
  {
    id: "qa-reviewer-mastery",
    title: "Quality Reviewer & Audit Masterclass",
    description: "Curriculum for senior annotators transitioning into reviewer and team lead roles with focus on precision metrics and SLA enforcement.",
    category: "Leadership & QA",
    status: "Draft",
    isPrimaryOnboarding: false,
    modulesCount: 5,
    sectionsCount: 10,
    assignedClusters: [],
    createdAt: "2026-11-15",
  },
];

