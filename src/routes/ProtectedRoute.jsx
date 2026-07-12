import { Navigate, useLocation } from 'react-router-dom';

/**
 * Decode a JWT payload without verifying signature (browser-side).
 * Falls back to localStorage 'role' for backward compat.
 */
const parseJwt = (token) => {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        // Support Node.js SSR environments where atob might need a fallback, though global in modern Node
        const decoded = typeof atob !== 'undefined' 
            ? atob(base64) 
            : Buffer.from(base64, 'base64').toString('binary');
        return JSON.parse(decoded);
    } catch {
        return null;
    }
};

const useAuth = () => {
    let token = null;
    
    if (typeof window === 'undefined') {
        // Server side: extract access_token from the global cookie header set in entry-server.jsx
        if (globalThis.__cookieHeader) {
            const match = globalThis.__cookieHeader.match(/(?:^|; )access_token=([^;]*)/);
            if (match) {
                token = decodeURIComponent(match[1]);
            }
        }
    } else {
        // Client side: fetch from localStorage
        token = localStorage.getItem('token');
    }

    if (!token) return { isAuthenticated: false, role: null, user: null };

    const payload = parseJwt(token);
    if (!payload) return { isAuthenticated: false, role: null, user: null };

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('user');
        }
        return { isAuthenticated: false, role: null, user: null };
    }

    const role = payload.role || (typeof window !== 'undefined' ? localStorage.getItem('role') : null);
    return { isAuthenticated: true, role, user: payload };
};

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, role } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        const isEmployeeRoute = location.pathname.startsWith('/employee');
        const isPMRoute = location.pathname.startsWith('/pm');
        const loginPath = isEmployeeRoute
            ? '/login/employee'
            : isPMRoute
                ? '/login/pm'
                : '/login/admin';
        return <Navigate to={loginPath} state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        // Redirect to the correct dashboard for their role
        const dashboardMap = {
            admin: '/admin/dashboard',
            pm: '/pm/dashboard',
            employee: '/employee/dashboard',
        };
        return <Navigate to={dashboardMap[role] || '/login/admin'} replace />;
    }

    return children;
};

export { useAuth };
export default ProtectedRoute;
