import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, role } = useAuthContext();
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

export default ProtectedRoute;
