// Shared card design system (extracted from Dashboard.jsx so the analytics
// pages and both dashboards reuse the same primitives).

export const CardSkeleton = () => (
  <div className="p-5 animate-pulse">
    <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
    <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
  </div>
);

export const Card = ({ children, className = '', loading = false, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-slate-300/80 hover:scale-[1.02]' : ''} ${className}`}
  >
    {loading ? <CardSkeleton /> : children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, badge }) => (
  <div className="flex items-center justify-between p-5 pb-0">
    <div>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {badge && <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">{badge}</span>}
      </div>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action && <div className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">{action}</div>}
  </div>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

export const CardFooter = ({ children }) => (
  <div className="px-5 py-3 border-t border-slate-100 text-sm text-slate-500">{children}</div>
);

// KPI tile
export const MetricCard = ({ title, value, subtitle, trend, trendPositive, icon: Icon, loading, onClick }) => (
  <Card loading={loading} onClick={onClick}>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{value}</span>
            {trend && (
              <span className={`text-sm font-semibold ${trendPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend}
              </span>
            )}
          </div>
          {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-3 bg-slate-50 rounded-xl">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default Card;
