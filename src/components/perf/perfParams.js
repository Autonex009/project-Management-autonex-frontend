// Fixed monthly performance-review parameters. Keep in sync with the backend
// app/constants/perf_params.py. These are hardcoded — no longer PM-defined.
export const PERF_PARAMETERS = [
    { name: 'Quality of Work', description: 'Consistently delivers accurate, thorough, and high-quality work.' },
    { name: 'Productivity & Efficiency', description: 'Completes assigned tasks on time and effectively manages workload.' },
    { name: 'Communication Skills', description: 'Communicates clearly, professionally, and keeps relevant stakeholders informed.' },
    { name: 'Teamwork & Collaboration', description: 'Works well with colleagues, contributes positively, and supports others when needed.' },
    { name: 'Initiative & Problem Solving', description: 'Demonstrates ownership, proactively identifies issues, and proposes effective solutions.' },
];

export const PERF_PARAM_NAMES = PERF_PARAMETERS.map((p) => p.name);

// Mean of a list of 1-5 ratings, rounded to 1 decimal. Returns null if empty.
export const averageOf = (ratings = []) => {
    const vals = ratings.map(Number).filter((n) => n >= 1 && n <= 5);
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
};

// Align a stored parameter_values array to the canonical five parameters,
// matching by name. Drops legacy names (e.g. old PM-defined params) and fills
// any missing parameter so the UI always renders exactly the fixed set.
export const normalizeParamValues = (parameterValues = []) => {
    const byName = new Map((parameterValues || []).map((p) => [p?.name, p || {}]));
    return PERF_PARAMETERS.map((fp) => {
        const stored = byName.get(fp.name) || {};
        return {
            name: fp.name,
            employee_rating: stored.employee_rating ?? null,
            pm_rating: stored.pm_rating ?? null,
            approved: stored.approved,
            feedback: stored.feedback ?? null,
        };
    });
};
