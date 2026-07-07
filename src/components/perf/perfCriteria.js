// Fixed performance-review criteria (must match backend PERFORMANCE_CRITERIA).
export const PERF_CRITERIA = [
    { key: 'quality', label: 'Quality of Work', description: 'Consistently delivers accurate, thorough, and high-quality work.' },
    { key: 'productivity', label: 'Productivity & Efficiency', description: 'Completes assigned tasks on time and effectively manages workload.' },
    { key: 'communication', label: 'Communication Skills', description: 'Communicates clearly, professionally, and keeps relevant stakeholders informed.' },
    { key: 'teamwork', label: 'Teamwork & Collaboration', description: 'Works well with colleagues, contributes positively, and supports others when needed.' },
    { key: 'initiative', label: 'Initiative & Problem Solving', description: 'Demonstrates ownership, proactively identifies issues, and proposes effective solutions.' },
];

export const PERF_CRITERIA_KEYS = PERF_CRITERIA.map((c) => c.key);

// 1–5 rating scale meaning.
export const RATING_SCALE = {
    1: 'Poor – Performance does not meet expectations',
    2: 'Needs Improvement – Frequently falls short of expectations',
    3: 'Meets Expectations – Consistently meets job requirements',
    4: 'Exceeds Expectations – Frequently performs above expectations',
    5: 'Outstanding – Consistently delivers exceptional results',
};

export const computeAverage = (criteria) => {
    const vals = PERF_CRITERIA_KEYS.map((k) => Number(criteria?.[k])).filter((n) => n >= 1 && n <= 5);
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
};

export const currentPeriod = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const formatPeriod = (period) => {
    if (!period) return '';
    const [y, m] = period.split('-').map(Number);
    if (!y || !m) return period;
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
