import React, { createContext, useContext, useState, useEffect } from 'react';

const parseJwt = (token) => {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        if (typeof window === 'undefined') {
            return JSON.parse(Buffer.from(base64, 'base64').toString());
        }
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
};

export const AuthContext = createContext({
    isAuthenticated: false,
    role: null,
    user: null,
});

export const AuthProvider = ({ children, ssrAuth }) => {
    const [auth, setAuth] = useState(() => {
        // Use server-provided auth state during SSR or initial hydration if available
        if (ssrAuth) {
            return ssrAuth;
        }

        // Fallback for client-side evaluation without ssrAuth
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (!token) return { isAuthenticated: false, role: null, user: null };

            const payload = parseJwt(token);
            if (!payload) return { isAuthenticated: false, role: null, user: null };

            if (payload.exp && payload.exp * 1000 < Date.now()) {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('user');
                return { isAuthenticated: false, role: null, user: null };
            }

            const role = payload.role || localStorage.getItem('role');
            return { isAuthenticated: true, role, user: payload };
        }

        return { isAuthenticated: false, role: null, user: null };
    });

    useEffect(() => {
        // Sync state if localStorage changes in another tab
        const handleStorageChange = (e) => {
            if (e.key === 'token') {
                if (!e.newValue) {
                    setAuth({ isAuthenticated: false, role: null, user: null });
                } else {
                    const payload = parseJwt(e.newValue);
                    if (payload) {
                        const role = payload.role || localStorage.getItem('role');
                        setAuth({ isAuthenticated: true, role, user: payload });
                    }
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => useContext(AuthContext);
