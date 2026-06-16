import axios from 'axios';

// Ensure HTTPS for production (non-localhost) URLs to prevent Mixed Content errors
let apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
if (!apiBaseUrl.includes('localhost') && apiBaseUrl.startsWith('http://')) {
    apiBaseUrl = apiBaseUrl.replace('http://', 'https://');
}

const api = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            // window.location.href = '/login/admin'; 
        }
        return Promise.reject(error);
    }
);

// === Projects API (Main Projects - formerly Parent Projects) ===
export const projectApi = {
    getAll: () => api.get('/projects').then(res => res.data),
    getOne: (id) => api.get(`/projects/${id}`).then(res => res.data),
    create: (data) => api.post('/projects', data).then(res => res.data),
    update: (id, data) => api.put(`/projects/${id}`, data).then(res => res.data),
    delete: (id) => api.delete(`/projects/${id}`).then(res => res.data),
    getContext: (id) => api.get(`/projects/${id}/context`).then(res => res.data),
    getCloneSuggestions: (id) => api.get(`/projects/${id}/clone-suggestions`).then(res => res.data),
};

// === Sub-Projects API (formerly Projects) ===
export const subProjectApi = {
    getAll: () => api.get('/sub-projects').then(res => res.data),
    getOne: (id) => api.get(`/sub-projects/${id}`).then(res => res.data),
    create: (data) => api.post('/sub-projects', data).then(res => res.data),
    update: (id, data) => api.put(`/sub-projects/${id}`, data).then(res => res.data),
    delete: (id) => api.delete(`/sub-projects/${id}`).then(res => res.data),
};

// === Project Groups API (intermediate hierarchy level: MainProject → ProjectGroup → Sub-Project) ===
// Backed by the SubProject model at /api/sub-projects-new. Distinct from subProjectApi above,
// which actually serves daily sheets (the child level).
export const projectGroupApi = {
    getAll: (mainProjectId) =>
        api.get('/sub-projects-new', { params: mainProjectId ? { main_project_id: mainProjectId } : {} })
            .then(res => res.data),
    getOne: (id) => api.get(`/sub-projects-new/${id}`).then(res => res.data),
    create: (data) => api.post('/sub-projects-new', data).then(res => res.data),
    update: (id, data) => api.put(`/sub-projects-new/${id}`, data).then(res => res.data),
    delete: (id) => api.delete(`/sub-projects-new/${id}`).then(res => res.data),
};

// === Recommendations API ===
export const recommendationsApi = {
    getByProject: (projectId) => api.get(`/recommendations/project/${projectId}`).then(res => res.data),
    getDashboard: () => api.get('/recommendations/dashboard').then(res => res.data),
    getTimeline: (projectId, includeDaily = false) =>
        api.get(`/recommendations/project/${projectId}/timeline`, { params: { include_daily: includeDaily } })
            .then(res => res.data),
};

// Backward compatibility alias
export const parentProjectApi = projectApi;

export const employeeApi = {
    getAll: (params) => api.get('/employees', { params }).then(res => res.data),
    getOne: (id) => api.get(`/employees/${id}`).then(res => res.data),
    create: (data) => api.post('/employees', data).then(res => res.data),
    update: (id, data) => api.put(`/employees/${id}`, data).then(res => res.data),
    delete: (id) => api.delete(`/employees/${id}`).then(res => res.data),
    getAvailability: (id) => api.get(`/employees/${id}/availability`).then(res => res.data),
    convertToFulltime: (id, data) => api.post(`/employees/${id}/convert-to-fulltime`, data).then(res => res.data),
    restore: (id) => api.post(`/employees/${id}/restore`).then(res => res.data),
};

export const allocationApi = {
    getAll: () => api.get('/allocations').then(res => res.data),
    create: (data) => api.post('/allocations', data).then(res => res.data),
    update: (id, data) => api.put(`/allocations/${id}`, data).then(res => res.data),
    delete: (id) => api.delete(`/allocations/${id}`).then(res => res.data),
    // NEW: Validation and filtering endpoints
    validate: (data) => api.post('/allocations/validate', data).then(res => res.data),
    getEmployeeStatus: (activeOnly = true) =>
        api.get('/allocations/employee-status', { params: { active_only: activeOnly } })
            .then(res => res.data),
    getByProject: (projectId) => api.get(`/allocations/by-project/${projectId}`).then(res => res.data),
    getByEmployee: (employeeId) => api.get(`/allocations/by-employee/${employeeId}`).then(res => res.data),
};

export const leaveApi = {
    getAll: (params) => api.get('/leaves', { params }).then(res => res.data),
    create: (data) => api.post('/leaves', data).then(res => res.data),
    update: (id, data) => api.put(`/leaves/${id}`, data).then(res => res.data),
    delete: (id) => api.delete(`/leaves/${id}`).then(res => res.data),
    approve: (id, approvedBy, remark) => api.patch(`/leaves/${id}/approve`, { remark: remark || null }, { params: { approved_by: approvedBy } }).then(res => res.data),
    reject: (id, approvedBy) => api.patch(`/leaves/${id}/reject`, null, { params: { approved_by: approvedBy } }).then(res => res.data),
    applyToRazorpay: (id) => api.post(`/leaves/${id}/apply-to-razorpay`).then(res => res.data),
    getCalendar: (month) => api.get('/leaves/calendar', { params: { month } }).then(res => res.data),
};

export const signupRequestApi = {
    submit: (data) => api.post('/signup-requests', data).then(res => res.data),
    getAll: (params) => api.get('/signup-requests', { params }).then(res => res.data),
    approve: (id, reviewedBy) => api.patch(`/signup-requests/${id}/approve`, null, { params: { reviewed_by: reviewedBy } }).then(res => res.data),
    reject: (id, reviewedBy, reason) => api.patch(`/signup-requests/${id}/reject`, { reason: reason || null }, { params: { reviewed_by: reviewedBy } }).then(res => res.data),
};

export const wfhApi = {
    getAll: (params) => api.get('/wfh', { params }).then(res => res.data),
    create: (data) => api.post('/wfh', data).then(res => res.data),
    update: (id, data) => api.put(`/wfh/${id}`, data).then(res => res.data),
    approve: (id, approvedBy, remark) => api.patch(`/wfh/${id}/approve`, { remark: remark || null }, { params: { approved_by: approvedBy } }).then(res => res.data),
    reject: (id, approvedBy, remark) => api.patch(`/wfh/${id}/reject`, { remark: remark || null }, { params: { approved_by: approvedBy } }).then(res => res.data),
    delete: (id) => api.delete(`/wfh/${id}`).then(res => res.data),
};

export const skillsApi = {
    getSummary: () => api.get('/skills/summary').then(res => res.data),
    getAll: () => api.get('/skills').then(res => res.data),
    create: (data) => api.post('/skills', data).then(res => res.data),
    delete: (id) => api.delete(`/skills/${id}`).then(res => res.data),
};

// Alias for inconsistency in naming if any
export const skillApi = skillsApi;

// === Auth API ===
export const authApi = {
    signup: (data) => api.post('/auth/signup', data).then(res => res.data),
    login: (data) => api.post('/auth/login', data).then(res => res.data),
    forgotPassword: (data) => api.post('/auth/forgot-password', data).then(res => res.data),
    resetPassword: (token, data) => api.post('/auth/reset-password', data, { params: { token } }).then(res => res.data),
    logout: () => api.post('/auth/logout').then(res => res.data),
    me: () => api.get('/auth/me').then(res => res.data),
    verify: () => api.get('/auth/verify').then(res => res.data),
};

// === Side Projects API ===
export const sideProjectApi = {
    getAll: (params) => api.get('/side-projects', { params }).then(res => res.data),
    create: (data) => api.post('/side-projects', data).then(res => res.data),
    update: (id, data) => api.put(`/side-projects/${id}`, data).then(res => res.data),
    delete: (id) => api.delete(`/side-projects/${id}`).then(res => res.data),
};

// === Guidelines API ===
export const guidelineApi = {
    getAll: (params) => api.get('/guidelines', { params }).then(res => res.data),
    getOne: (id) => api.get(`/guidelines/${id}`).then(res => res.data),
    create: (data) => api.post('/guidelines', data).then(res => res.data),
    upload: (formData) => api.post('/guidelines/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
    update: (id, data) => api.put(`/guidelines/${id}`, data).then(res => res.data),
    delete: (id) => api.delete(`/guidelines/${id}`).then(res => res.data),
};

// === Payroll API ===
// The payroll passcode (entered on the Payroll page) is sent with every payroll
// request; the backend rejects payroll calls without it when PAYROLL_PASSCODE is set.
const payrollHeaders = () => {
    const pc = sessionStorage.getItem('payroll_passcode');
    return pc ? { 'X-Payroll-Passcode': pc } : {};
};

export const payrollApi = {
    getPreview: (month) => api.get('/payroll/preview', { params: { month }, headers: payrollHeaders() }).then(res => res.data),
    save: (data) => api.post('/payroll/save', data, { headers: payrollHeaders() }).then(res => res.data),
    getSaved: (month) => api.get('/payroll/saved', { params: { month }, headers: payrollHeaders() }).then(res => res.data),
    exportCsvUrl: (month) => `${apiBaseUrl}/payroll/export.csv?month=${month}&passcode=${encodeURIComponent(sessionStorage.getItem('payroll_passcode') || '')}`,
};

// === Referrals API ===
export const referralApi = {
    getAll: (params) => api.get('/referrals', { params }).then(res => res.data),
    getOne: (id) => api.get(`/referrals/${id}`).then(res => res.data),
    create: (data) => api.post('/referrals', data).then(res => res.data),
    updateStatus: (id, status, statusNote) =>
        api.patch(`/referrals/${id}/status`, { status, status_note: statusNote || null }).then(res => res.data),
    delete: (id) => api.delete(`/referrals/${id}`).then(res => res.data),
};

// === Performance Reviews API ===
export const performanceReviewApi = {
    getAll: (params) => api.get('/performance-reviews', { params }).then(res => res.data),
    getOne: (id) => api.get(`/performance-reviews/${id}`).then(res => res.data),
    create: (data) => api.post('/performance-reviews', data).then(res => res.data),
    update: (id, data) => api.put(`/performance-reviews/${id}`, data).then(res => res.data),
    delete: (id) => api.delete(`/performance-reviews/${id}`).then(res => res.data),
};

// === Notifications API ===
export const notificationApi = {
    getAll: (userId) => api.get('/notifications', { params: { user_id: userId } }).then(res => res.data),
    markRead: (id, userId) => api.patch(`/notifications/${id}/read`, null, { params: { user_id: userId } }).then(res => res.data),
    markAllRead: (userId) => api.patch('/notifications/read-all', null, { params: { user_id: userId } }).then(res => res.data),
};

// === Onboarding API ===
export const onboardingApi = {
    getModules: (includeDrafts = false) => api.get('/onboarding/modules', { params: { include_drafts: includeDrafts } }).then(res => res.data),
    getModule: (id) => api.get(`/onboarding/modules/${id}`).then(res => res.data),
    createModule: (data) => api.post('/onboarding/modules', data).then(res => res.data),
    updateModule: (id, data) => api.put(`/onboarding/modules/${id}`, data).then(res => res.data),
    deleteModule: (id) => api.delete(`/onboarding/modules/${id}`).then(res => res.data),
    createSection: (moduleId, data) => api.post(`/onboarding/modules/${moduleId}/sections`, data).then(res => res.data),
    deleteSection: (id) => api.delete(`/onboarding/sections/${id}`).then(res => res.data),
    importQuestions: (moduleId, sectionId, formData) => api.post(`/onboarding/modules/${moduleId}/sections/${sectionId}/import-questions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
    getQuizSampleUrl: () => `${apiBaseUrl}/onboarding/modules/quiz-sample-excel`,
    recordProgress: (moduleId, sectionId, userId = null) => api.post('/onboarding/progress/section', { module_id: moduleId, section_id: sectionId, user_id: userId }).then(res => res.data),
    getProgress: (userId) => api.get(`/onboarding/progress/${userId}`).then(res => res.data),
    submitQuiz: (sectionId, answers, userId = null) => api.post('/onboarding/quiz/submit', { section_id: sectionId, answers, user_id: userId }).then(res => res.data),
    getTeam: () => api.get('/onboarding/team').then(res => res.data),
    createTeamMember: (data) => api.post('/onboarding/team', data).then(res => res.data),
    updateTeamMember: (id, data) => api.put(`/onboarding/team/${id}`, data).then(res => res.data),
    deleteTeamMember: (id) => api.delete(`/onboarding/team/${id}`).then(res => res.data),
    importTeam: (formData) => api.post('/onboarding/team/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
    getTeamSampleUrl: () => `${apiBaseUrl}/onboarding/team/sample-excel`,
    getCandidateDashboard: (userId) => api.get(`/onboarding/candidates/${userId}/dashboard`).then(res => res.data),
    getAnalyticsDashboard: () => api.get('/onboarding/analytics/dashboard').then(res => res.data),
    getFullAnalytics: () => api.get('/onboarding/analytics/full').then(res => res.data),
    getMentees: (mentorId) => api.get(`/onboarding/mentors/${mentorId}/mentees`).then(res => res.data),
    getReports: () => api.get('/onboarding/reports').then(res => res.data),
    getReportsExportUrl: () => `${apiBaseUrl}/onboarding/reports/export`,
};

export default api;

