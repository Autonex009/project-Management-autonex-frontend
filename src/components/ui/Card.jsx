// Shared card design system (extracted from Dashboard.jsx so the analytics
// pages and both dashboards reuse the same primitives).

export const CardSkeleton = () => (
  <div className="p-5 animate-pulse">
    <div className="h-4 bg-slate-200 dark:bg-white/[0.08] rounded w-1/3 mb-4"></div>
    <div className="h-8 bg-slate-200 dark:bg-white/[0.08] rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-slate-100 dark:bg-white/[0.05] rounded w-2/3"></div>
  </div>
);

export const Card = ({ children, className = '', loading = false, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white dark:bg-[#0f0f0f] rounded-2xl border border-slate-200/60 dark:border-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-slate-300/80 dark:hover:border-neutral-700' : ''} ${className}`}
  >
    {loading ? <CardSkeleton /> : children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, badge }) => (
  <div className="flex items-center justify-between p-5 pb-0">
    <div>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-zinc-100">{title}</h3>
        {badge && <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 rounded-full">{badge}</span>}
      </div>
      {subtitle && <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer">{action}</div>}
  </div>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

export const CardFooter = ({ children }) => (
  <div className="px-5 py-3 border-t border-slate-100 dark:border-neutral-800 text-sm text-slate-500 dark:text-zinc-400">{children}</div>
);

// KPI tile
export const MetricCard = ({ title, value, subtitle, trend, trendPositive, icon: Icon, loading, onClick }) => (
  <Card loading={loading} onClick={onClick}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-slate-500 dark:text-zinc-400">{title}</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-semibold text-slate-900 dark:text-zinc-100 tracking-tight">{value}</span>
            {trend && (
              <span className={`text-sm font-semibold ${trendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {trend}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2.5 bg-slate-50 dark:bg-white/[0.05] rounded-lg">
            <Icon className="w-[18px] h-[18px] text-slate-600 dark:text-zinc-300" />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default Card;
