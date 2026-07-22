import { Link, useLocation } from 'react-router-dom';
import { LogOut, GraduationCap, FileSpreadsheet, Sparkles, Sun, Moon, Settings, ChevronDown } from 'lucide-react';
import { navigation } from '../config/navigation';
import { useState } from 'react';

const onboardingNavigation = [
  { name: 'Training Modules', href: '/admin/modules', icon: GraduationCap },
  { name: 'Newly Onboarded', href: '/admin/newly-onboarded', icon: Sparkles },
  { name: 'Progress Reports', href: '/admin/onboarding-reports', icon: FileSpreadsheet },
];

const COMPANY_SETTINGS_HREF = '/admin/company-settings';

// Shared Linear-style row classes (light base + dark: variants). Kept in one
// place so both nav sections stay identical and future tweaks touch one spot.
const rowBase = 'flex items-center gap-2.5 w-full px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors duration-150 group relative';
const rowActive = 'bg-white text-blue-700 shadow-sm dark:bg-white/[0.08] dark:text-zinc-100 dark:shadow-none';
const rowInactive = 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/[0.05]';

// Compact icon button used in the bottom bar.
const iconBtn = 'w-9 h-9 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:border-neutral-800 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors';

const iconClass = (isActive) =>
  `w-4 h-4 shrink-0 transition-colors ${isActive
    ? 'text-blue-600 dark:text-zinc-100'
    : 'text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-200'}`;

const AdminSidebar = ({ user = {}, pendingSignupCount = 0, onNavigate, onLogout, theme = 'dark', onToggleTheme }) => {
  const location = useLocation();
  const [openSections, setOpenSections] = useState({ platform: true, onboarding: true });
  const toggleSection = (id) => setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  const handleNavigate = () => onNavigate?.();

  const isRowActive = (href) =>
    location.pathname === href || (href !== '/admin/dashboard' && location.pathname.startsWith(href + '/'));

  // Company Settings moves to the bottom bar, so drop it from the main list.
  const platformItems = navigation.filter((item) => item.href !== COMPANY_SETTINGS_HREF);

  const renderItem = (item) => {
    const isActive = isRowActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={handleNavigate}
        className={`${rowBase} ${isActive ? rowActive : rowInactive}`}
      >
        <Icon className={iconClass(isActive)} />
        <span className="truncate">{item.name}</span>
        {item.href === '/admin/signup-requests' && pendingSignupCount > 0 && (
          <span className="ml-auto inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full text-[10px] font-semibold shrink-0 bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
            {pendingSignupCount}
          </span>
        )}
      </Link>
    );
  };

  const renderSection = (id, label, items) => (
    <div>
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between gap-2 px-2.5 h-6 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/[0.04] transition-colors group"
      >
        <span className="text-[12px] font-semibold truncate">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 ${openSections[id] ? '' : '-rotate-90'}`} />
      </button>
      {openSections[id] && <div className="mt-0.5 space-y-0.5">{items.map(renderItem)}</div>}
    </div>
  );

  const companySettingsActive = isRowActive(COMPANY_SETTINGS_HREF);

  return (
    <div className="h-full flex flex-col overflow-visible bg-[#f4f5f7] dark:bg-[#070707]">
      {/* Brand Header — compact workspace-style row (Linear) */}
      <div className="shrink-0 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.png" alt="Autonex" className="h-8 w-8 rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-1 shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100 truncate leading-tight">Autonex</p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate leading-tight">Admin Control Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-2.5 py-2 space-y-3 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="space-y-0.5">{platformItems.map(renderItem)}</div>
        {renderSection('onboarding', 'Onboarding Portal', onboardingNavigation)}
      </nav>

      {/* Bottom Bar — profile · settings · theme · sign out */}
      <div className="shrink-0 p-2.5 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
        {/* Profile (hover shows email) */}
        <div className="group relative">
          <button
            type="button"
            className="h-9 w-9 flex items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
          >
            <img src="/favicon.png" alt="Autonex" className="h-full w-full object-contain p-1" />
          </button>
          <div className="absolute bottom-full left-0 mb-2 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50 shadow-xl">
            {user.email || 'Admin'} · Super Admin
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Link
            to={COMPANY_SETTINGS_HREF}
            onClick={handleNavigate}
            title="Company Settings"
            className={`${iconBtn} ${companySettingsActive ? 'text-blue-600 bg-white shadow-sm dark:text-white dark:bg-white/[0.08] dark:shadow-none' : ''}`}
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={iconBtn}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onLogout}
            title="Sign Out"
            className={`${iconBtn} hover:text-red-600 hover:bg-red-50 dark:hover:text-white dark:hover:bg-red-600/15`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
