import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { subProjectApi, employeeApi, allocationApi, leaveApi, skillsApi } from '../services/api';
import { FolderKanban, Calendar, Users, AlertTriangle, ArrowUpRight, Activity, Zap, Target, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import { MetricCard } from '../components/ui/Card';
import { format, isValid, isWithinInterval, parseISO } from 'date-fns';
import { getWorkingDays } from '../utils/dateCalculations';

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

  const { startStr, endStr } = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
    return { startStr: start, endStr: end };
  }, []);

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves', startStr, endStr],
    queryFn: () => leaveApi.getAll({ start_date: startStr, end_date: endStr }),
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
    if (!leave.start_date || !leave.end_date) return false;
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

  // Status indicator — minimal dot + colored label (Linear/dark friendly)
  const StatusBadge = ({ status }) => {
    const config = {
      balanced: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'On Track' },
      overburden: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: 'At Risk' },
      underutilized: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Optimize' },
      no_staff: { dot: 'bg-slate-400 dark:bg-zinc-500', text: 'text-slate-500 dark:text-zinc-400', label: 'Unassigned' },
      overdue: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: 'Overdue' },
    };
    const c = config[status] || { text: 'text-amber-600 dark:text-amber-400' };
    return (
      <span className={`text-xs font-medium capitalize ${c.text}`}>{c.label || status}</span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-zinc-500 text-[13px] mt-0.5">Resource allocation & project insights</p>
      </div>

      {/* ===== BENTO GRID LAYOUT ===== */}
      {/* Row 1: KPI Metric Cards (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Projects"
          value={activeProjects}
          subtitle={`${totalProjects} total`}
          icon={FolderKanban}
          loading={projectsLoading}
          onClick={() => navigate('/admin/sub-projects?status=active')}
        />
        <MetricCard
          title="Delivery Risks"
          value={overburdenProjects.length}
          subtitle="Need attention"
          icon={AlertTriangle}
          trend={overburdenProjects.length > 0 ? '!' : null}
          trendPositive={false}
          onClick={() => navigate('/admin/sub-projects?recommendation=overburdened')}
        />
        <MetricCard
          title="Utilization"
          value={`${utilizationRate}%`}
          subtitle={`${underutilizedEmployees.length} unallocated`}
          icon={TrendingUp}
          onClick={() => navigate('/admin/allocations')}
        />
        <MetricCard
          title="Team Available"
          value={activeEmployees - employeesOnLeave.length}
          subtitle={`${employeesOnLeave.length} on leave`}
          icon={Users}
          onClick={() => navigate('/admin/employees')}
        />
      </div>

      {/* Row 2-3: Project Status (full width) */}
      <div>
        <div className="mb-3">
          <h3 className="font-semibold text-slate-800 dark:text-zinc-100">Project Status</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-500 mt-0.5">Overview of active sub-projects</p>
        </div>
        <Table
          loading={projectsLoading}
          rowClassName={() => 'group'}
          columns={[
                  {
                    key: 'project',
                    label: 'Project',
                    render: (project) => (
                      <div>
                        <div className="font-medium text-slate-800 dark:text-zinc-200">{project.name}</div>
                        <div className="text-xs text-slate-400 dark:text-zinc-500">{project.client}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'analysis',
                    label: 'Status',
                    align: 'center',
                    render: (analysis) => <StatusBadge status={analysis.status} />,
                  },
                  {
                    key: '_deadline',
                    label: 'Deadline',
                    align: 'center',
                    render: (_, row) => (
                      <span className="text-sm text-slate-600 dark:text-zinc-400 font-mono">
                        {row.project.end_date ? format(parseISO(row.project.end_date), 'MMM dd') : '—'}
                      </span>
                    ),
                  },
                  {
                    key: '_insight',
                    label: 'Insight',
                    align: 'right',
                    render: (_, row) => row.analysis.recommendation ? (
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-500">{row.analysis.recommendation.message}</span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-zinc-600">—</span>
                    ),
                  },
          ]}
          data={projectAnalyses.slice(0, 10)}
          emptyState={{ title: 'No projects', description: 'Active projects will appear here' }}
        />
        <div className="mt-3">
          <Button variant="link" onClick={() => navigate('/admin/sub-projects')}>
            View all projects <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
