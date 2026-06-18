import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { subProjectApi, employeeApi, allocationApi, leaveApi, skillsApi } from '../services/api';
import { FolderKanban, Calendar, Users, AlertTriangle, ArrowUpRight, Activity, Zap, Target, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { getWorkingDays } from '../utils/dateCalculations';

// ===============================================
// DESIGN SYSTEM: Card Component Architecture
// ===============================================

// The Core Card Shell
const Card = ({ children, className = '', loading = false }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow duration-300 ${className}`}>
    {loading ? <CardSkeleton /> : children}
  </div>
);

const CardHeader = ({ title, subtitle, action, badge }) => (
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

const CardContent = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

const CardFooter = ({ children }) => (
  <div className="px-5 py-3 border-t border-slate-100 text-sm text-slate-500">{children}</div>
);

const CardSkeleton = () => (
  <div className="p-5 animate-pulse">
    <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
    <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
  </div>
);

// Variant: Metric Card (KPI)
const MetricCard = ({ title, value, subtitle, trend, trendPositive, icon: Icon, loading }) => (
  <Card loading={loading}>
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

// Variant: Action Card (Add New)
const ActionCard = ({ title, icon: Icon, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-200 cursor-pointer p-6 flex flex-col items-center justify-center text-center group min-h-[160px]"
  >
    <div className="p-3 bg-slate-100 group-hover:bg-indigo-100 rounded-xl mb-3 transition-colors">
      <Icon className="w-6 h-6 text-slate-500 group-hover:text-indigo-600 transition-colors" />
    </div>
    <span className="font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">{title}</span>
  </div>
);

// ===============================================
// DASHBOARD COMPONENT
// ===============================================

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['sub-projects'],
    queryFn: subProjectApi.getAll,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeeApi.getAll,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['allocations'],
    queryFn: allocationApi.getAll,
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves'],
    queryFn: leaveApi.getAll,
  });

  const { data: skillsSummary = {} } = useQuery({
    queryKey: ['skillsSummary'],
    queryFn: skillsApi.getSummary,
  });

  // Stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.project_status === 'active').length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const allocatedEmployeeIds = new Set(allocations.map(a => a.employee_id));
  const utilizationRate = Math.round((allocatedEmployeeIds.size / activeEmployees) * 100) || 0;

  const today = new Date();
  const employeesOnLeave = leaves.filter(leave => {
    const start = parseISO(leave.start_date);
    const end = parseISO(leave.end_date);
    return isWithinInterval(today, { start, end });
  });

  // Project analysis
  const getProjectAnalysis = useMemo(() => (project) => {
    if (!project.end_date) return { status: 'unknown', recommendation: null };

    // Use remaining tasks if available, otherwise total tasks
    const taskCount = project.remaining_tasks !== undefined ? project.remaining_tasks : project.total_tasks;
    const requiredHours = taskCount * project.estimated_time_per_task;
    const workingDaysRemaining = getWorkingDays(new Date(), project.end_date);

    if (workingDaysRemaining <= 0) return { status: 'overdue', recommendation: { message: 'Past deadline' } };

    // Get all allocations for this project
    const projectAllocations = allocations.filter(a => a.sub_project_id === project.id);
    const allocatedCount = projectAllocations.length;

    // Count employees on leave during project dates (active count excludes those on leave)
    const activeAllocatedCount = projectAllocations.filter(a => {
      const empLeaves = leaves.filter(l => l.employee_id === a.employee_id);
      const hasOverlap = empLeaves.some(l =>
        new Date(l.start_date) <= new Date(project.end_date) &&
        new Date(l.end_date) >= new Date(project.start_date)
      );
      return !hasOverlap;
    }).length;

    // Fix: If explicitly allocated enough people (active, not on leave), it is balanced
    if (project.required_manpower && activeAllocatedCount >= project.required_manpower) {
      return { status: 'balanced', recommendation: null };
    }

    const standardDayHours = 8; // Use standard 8h day instead of average of all employees
    const totalCap = activeAllocatedCount * standardDayHours * workingDaysRemaining;

    if (activeAllocatedCount === 0) return { status: 'no_staff', recommendation: { message: 'Needs staffing' } };

    const loadRatio = requiredHours / totalCap;
    if (loadRatio > 1.1) {
      // Calculate deficit based on required manpower if available, otherwise by hours
      if (project.required_manpower && activeAllocatedCount < project.required_manpower) {
        const extraNeeded = project.required_manpower - activeAllocatedCount;
        return { status: 'overburden', recommendation: { message: `+${extraNeeded} staff needed` } };
      }
      const deficitHours = requiredHours - totalCap;
      const extraNeeded = Math.ceil(deficitHours / (workingDaysRemaining * standardDayHours));
      return { status: 'overburden', recommendation: { message: `+${extraNeeded} staff needed` } };
    }
    if (loadRatio < 0.5 && activeAllocatedCount > 1) return { status: 'underutilized', recommendation: { message: 'Surplus capacity' } };
    return { status: 'balanced', recommendation: null };
  }, [allocations, leaves]);

  const projectAnalyses = projects.map(p => ({ project: p, analysis: getProjectAnalysis(p) }));
  const overburdenProjects = projectAnalyses.filter(pa => pa.analysis.status === 'overburden');
  const underutilizedEmployees = employees.filter(e => e.status === 'active' && !allocatedEmployeeIds.has(e.id));

  // Status Badge Component
  const StatusBadge = ({ status }) => {
    const styles = {
      balanced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      overburden: 'bg-red-50 text-red-700 border-red-200',
      underutilized: 'bg-amber-50 text-amber-700 border-amber-200',
      no_staff: 'bg-slate-100 text-slate-600 border-slate-200',
      overdue: 'bg-red-50 text-red-700 border-red-200',
    };
    const labels = {
      balanced: 'On Track',
      overburden: 'At Risk',
      underutilized: 'Optimize',
      no_staff: 'Unassigned',
      overdue: 'Overdue',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.no_staff}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'balanced' ? 'bg-emerald-500' : status === 'overburden' || status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-8 p-2">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Resource allocation & project insights</p>
      </div>

      {/* ===== BENTO GRID LAYOUT ===== */}
      {/* Row 1: KPI Metric Cards (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Active Projects"
          value={activeProjects}
          subtitle={`${totalProjects} total`}
          icon={FolderKanban}
          loading={projectsLoading}
        />
        <MetricCard
          title="Delivery Risks"
          value={overburdenProjects.length}
          subtitle="Need attention"
          icon={AlertTriangle}
          trend={overburdenProjects.length > 0 ? '!' : null}
          trendPositive={false}
        />
        <MetricCard
          title="Utilization"
          value={`${utilizationRate}%`}
          subtitle={`${underutilizedEmployees.length} unallocated`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Team Available"
          value={activeEmployees - employeesOnLeave.length}
          subtitle={`${employeesOnLeave.length} on leave`}
          icon={Users}
        />
      </div>

      {/* Row 2-3: Main Content (8 cols) + Sidebar (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Main List Card (8 cols) */}
        <div className="xl:col-span-8">
          <Card>
            <CardHeader
              title="Project Status"
              subtitle="Overview of active sub-projects"
            />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Deadline</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Insight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {projectAnalyses.slice(0, 5).map(({ project, analysis }) => (
                      <tr key={project.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">{project.name}</div>
                          <div className="text-xs text-slate-400">{project.client}</div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={analysis.status} />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm text-slate-600 font-mono">
                            {format(parseISO(project.end_date), 'MMM dd')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {analysis.recommendation ? (
                            <span className="text-xs font-medium text-slate-500">{analysis.recommendation.message}</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter>
              <button onClick={() => navigate('/admin/sub-projects')} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                View all projects <ChevronRight className="w-4 h-4" />
              </button>
            </CardFooter>
          </Card>
        </div>

        {/* Sidebar (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Skills Card */}
          <Card>
            <CardHeader title="Skill Availability" />
            <CardContent>
              <div className="space-y-4">
                {skillsSummary.skills && Object.entries(skillsSummary.skills).slice(0, 5).map(([skill, data]) => {
                  const percentage = Math.round((data.available / data.total) * 100) || 0;
                  const isLow = percentage < 30;
                  return (
                    <div key={skill}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-slate-700 capitalize">{skill}</span>
                        <span className={`font-mono text-xs ${isLow ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>{data.available}/{data.total}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <ActionCard title="New Project" icon={Plus} onClick={() => navigate('/admin/projects')} />
            <ActionCard title="Allocate" icon={Users} onClick={() => navigate('/admin/allocations')} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
