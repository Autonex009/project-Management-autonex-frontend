// Fixed monthly performance-review parameters with category weightages.
// Keep in sync with the backend app/constants/perf_params.py.
export const PERF_PARAMETERS = [
  {
    category: "Productivity",
    name: "Output vs. Standard Benchmark",
    weight: 0.25,
    weightPct: 25,
    description:
      "Volume and output delivery measured against defined project quotas and task benchmarks.",
  },
  {
    category: "Accuracy & Quality",
    name: "QA / Error Identification Accuracy",
    weight: 0.25,
    weightPct: 25,
    description:
      "Precision of work, QA pass rates, and thoroughness in identifying/preventing errors.",
  },
  {
    category: "Diligence",
    name: "Correction & Feedback Compliance",
    weight: 0.10,
    weightPct: 10,
    description:
      "Speed, accuracy, and adherence when applying reviewer corrections and feedback loops.",
  },
  {
    category: "Professional Discipline",
    name: "Attendance & Punctuality",
    weight: 0.05,
    weightPct: 5,
    description:
      "Punctuality, check-in discipline, shift adherence, and attendance consistency.",
  },
  {
    category: "Knowledge & Understanding",
    name: "Standardised Quiz / Assessment",
    weight: 0.15,
    weightPct: 15,
    description:
      "Performance on standardized domain quizzes, guidelines understanding, and platform assessments.",
  },
  {
    category: "Learning & Application",
    name: "Application of Guidelines & Reduction in Repeat Errors",
    weight: 0.15,
    weightPct: 15,
    description:
      "Proactive learning, guideline retention, and continuous reduction in repeat mistake patterns.",
  },
  {
    category: "Communication & Engagement",
    name: "Communication SLA Compliance",
    weight: 0.05,
    weightPct: 5,
    description:
      "Responsiveness on Slack/communication channels, prompt blocker escalation, and stakeholder communication.",
  },
];

export const PERF_PARAM_NAMES = PERF_PARAMETERS.map((p) => p.name);

export const PERF_PARAM_WEIGHTS = Object.fromEntries(
  PERF_PARAMETERS.map((p) => [p.name, p.weight])
);

export const PERF_PARAM_CATEGORIES = Object.fromEntries(
  PERF_PARAMETERS.map((p) => [p.name, p.category])
);

// Legacy parameters preserved for historical review rendering
export const LEGACY_PERF_PARAMETERS = [
  {
    name: "Quality of Work",
    description: "Consistently delivers accurate, thorough, and high-quality work.",
  },
  {
    name: "Productivity & Efficiency",
    description: "Completes assigned tasks on time and effectively manages workload.",
  },
  {
    name: "Communication Skills",
    description: "Communicates clearly, professionally, and keeps relevant stakeholders informed.",
  },
  {
    name: "Teamwork & Collaboration",
    description: "Works well with colleagues, contributes positively, and supports others when needed.",
  },
  {
    name: "Initiative & Problem Solving",
    description: "Demonstrates ownership, proactively identifies issues, and proposes effective solutions.",
  },
];

export const LEGACY_PERF_PARAM_NAMES = LEGACY_PERF_PARAMETERS.map((p) => p.name);

// Mean of a list of 1-5 ratings, rounded to 1 decimal. Returns null if empty.
export const averageOf = (ratings = []) => {
  const vals = ratings.map(Number).filter((n) => n >= 1 && n <= 5);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
};

// Weighted rating out of 5.0 based on parameter weights.
// Accepts either an array of objects ({ name, rating } or { name, pm_rating })
// or an object map ({ [paramName]: rating }).
export const weightedAverageOf = (input, ratingKey = null) => {
  if (!input) return null;

  let totalWeight = 0;
  let weightedSum = 0;

  if (Array.isArray(input)) {
    // Check if input uses new parameters
    const hasWeightedParam = input.some((p) => PERF_PARAM_WEIGHTS[p?.name] !== undefined);
    if (!hasWeightedParam) {
      // Legacy fallback
      const vals = input
        .map((p) => (ratingKey ? p?.[ratingKey] : p?.rating ?? p?.pm_rating ?? p?.employee_rating))
        .filter((v) => v != null && v >= 1 && v <= 5);
      return averageOf(vals);
    }

    input.forEach((item) => {
      const name = item?.name;
      const weight = PERF_PARAM_WEIGHTS[name];
      const val = ratingKey
        ? item?.[ratingKey]
        : item?.rating ?? item?.pm_rating ?? item?.employee_rating;
      if (weight !== undefined && val != null && val >= 1 && val <= 5) {
        weightedSum += Number(val) * weight;
        totalWeight += weight;
      }
    });
  } else if (typeof input === "object") {
    Object.entries(input).forEach(([name, val]) => {
      const weight = PERF_PARAM_WEIGHTS[name];
      if (weight !== undefined && val != null && val >= 1 && val <= 5) {
        weightedSum += Number(val) * weight;
        totalWeight += weight;
      }
    });
  }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
};

// Align a stored parameter_values array to either the canonical 7 weighted parameters
// or the legacy 5 parameters for historical cycles.
export const normalizeParamValues = (parameterValues = []) => {
  const byName = new Map(
    (parameterValues || []).map((p) => [p?.name, p || {}])
  );

  // Check if existing data is using the 7 weighted parameters
  const isNewWeighted = (parameterValues || []).some(
    (p) => PERF_PARAM_WEIGHTS[p?.name] !== undefined
  );

  const template = isNewWeighted || (parameterValues || []).length === 0
    ? PERF_PARAMETERS
    : LEGACY_PERF_PARAMETERS;

  return template.map((fp) => {
    const stored = byName.get(fp.name) || {};
    return {
      category: fp.category || stored.category || null,
      name: fp.name,
      weight: fp.weight || stored.weight || null,
      weightPct: fp.weightPct || null,
      description: fp.description || null,
      employee_rating: stored.employee_rating ?? null,
      pm_rating: stored.pm_rating ?? null,
      approved: stored.approved,
      feedback: stored.feedback ?? null,
    };
  });
};
