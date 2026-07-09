import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, 
  CheckCheck, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Trash2, 
  UserPlus, 
  Clock 
} from 'lucide-react';
import { notificationApi } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  leave_applied: { icon: FileText, bg: 'bg-blue-50 text-blue-600 border border-blue-100/50' },
  leave_approved: { icon: CheckCircle2, bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' },
  leave_rejected: { icon: XCircle, bg: 'bg-rose-50 text-rose-600 border border-rose-100/50' },
  wfh_applied: { icon: FileText, bg: 'bg-blue-50 text-blue-600 border border-blue-100/50' },
  wfh_approved: { icon: CheckCircle2, bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' },
  wfh_rejected: { icon: XCircle, bg: 'bg-rose-50 text-rose-600 border border-rose-100/50' },
  signup_request: { icon: UserPlus, bg: 'bg-amber-50 text-amber-600 border border-amber-100/50' },
  signup_approved: { icon: CheckCircle2, bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' },
  employee_converted: { icon: CheckCircle2, bg: 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' },
  referral: { icon: UserPlus, bg: 'bg-blue-50 text-blue-600 border border-blue-100/50' },
};

const getNotificationConfig = (type) => {
  return TYPE_CONFIG[type] || { icon: Info, bg: 'bg-slate-50 text-slate-600 border border-slate-100' };
};

const getNotificationRoute = (notification, userRole) => {
  const type = notification.type;
  const title = notification.title || "";

  if (
    type === 'leave_applied' || type === 'leave_approved' || type === 'leave_rejected' ||
    type === 'wfh_applied' || type === 'wfh_approved' || type === 'wfh_rejected'
  ) {
    if (userRole === 'admin') {
      return '/admin/leaves';
    } else if (userRole === 'pm') {
      // If it starts with "New " or contains "request from", it's a team leave request that needs approval.
      // Otherwise (e.g. "Leave request submitted", "Leave approved", "Leave declined", etc.) it's their own leave.
      if (title.startsWith("New ") || title.includes("request from")) {
        return '/pm/leaves';
      }
      return '/pm/my-leaves';
    } else {
      return '/employee/leaves';
    }
  }

  if (type === 'signup_request' || type === 'signup_approved') {
    if (userRole === 'admin') {
      return '/admin/signup-requests';
    }
  }

  if (type === 'employee_converted') {
    if (userRole === 'employee') {
      return '/employee/profile';
    }
  }

  if (type === 'referral') {
    if (userRole === 'admin') {
      return '/admin/referrals';
    } else if (userRole === 'employee') {
      return '/employee/referrals';
    }
  }

  // Fallback routes based on role
  if (userRole === 'admin') return '/admin/dashboard';
  if (userRole === 'pm') return '/pm/dashboard';
  return '/employee/dashboard';
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const didMountRef = useRef(false);
  const queryClient = useQueryClient();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState({});
  const [role, setRole] = useState('employee');

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setRole(localStorage.getItem('role') || parsed.role || 'employee');
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, []);

  const userId = user.id;

  // Event-driven (no polling): React Query refetches on mount + tab refocus; we add
  // refetch-on-navigation and refetch-on-open below. Cuts the constant 15s drumbeat.
  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationApi.getAll(userId),
    enabled: !!userId && mounted,
    staleTime: 15_000,
    refetchOnWindowFocus: true, // global default is false; enable just for notifications
  });

  // Refetch when the route changes (skip the initial mount — the query already fetches then)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (userId) refetch();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readCount = notifications.filter(n => n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markRead(id, userId),
    onSuccess: () => queryClient.invalidateQueries(['notifications', userId]),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(userId),
    onSuccess: () => queryClient.invalidateQueries(['notifications', userId]),
  });

  const clearReadMutation = useMutation({
    mutationFn: () => notificationApi.clearRead(userId),
    onSuccess: () => queryClient.invalidateQueries(['notifications', userId]),
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!mounted || !userId) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => { const next = !o; if (next && userId) refetch(); return next; })}
        className={`relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 rounded-xl transition-all duration-200 ${open ? 'bg-slate-100 text-slate-800' : ''}`}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 transition-transform duration-300 hover:rotate-12" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white leading-none shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-slate-100/80 z-50 flex flex-col max-h-[490px] overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
              {unreadCount > 0 ? (
                <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">{unreadCount} unread</p>
              ) : (
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">All caught up</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50/50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {readCount > 0 && (
                <button
                  onClick={() => clearReadMutation.mutate()}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all  hover:text-red-600 hover:border-red-100 hover:bg-red-50"
                  title="Clear all read notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear read</span>
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-50 py-1 max-h-[350px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                  <Calendar className="w-6 h-6 text-slate-400 opacity-60" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">No notifications yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                  We'll notify you here when leaves are requested, approved, or changed.
                </p>
              </div>
            ) : (
              notifications.map(n => {
                const config = getNotificationConfig(n.type);
                const IconComponent = config.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markReadMutation.mutate(n.id);
                      const route = getNotificationRoute(n, role);
                      navigate(route);
                      setOpen(false);
                    }}
                    className={`relative w-full text-left px-5 py-3.5 transition-all duration-200 border-l-[3px] hover:bg-slate-50/70 flex gap-3.5 items-start ${
                      !n.is_read 
                        ? 'bg-indigo-50/25 border-l-indigo-600' 
                        : 'border-l-transparent'
                    }`}
                  >
                    {/* Icon badge */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${config.bg}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content text */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs leading-snug break-words ${!n.is_read ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="shrink-0 mt-1.5 flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">{n.message}</p>
                      
                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
