import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subProjectApi, employeeApi, allocationApi, leaveApi, skillsApi, analyticsApi } from '../services/api'; 
import { FolderKanban, Calendar, Users, AlertTriangle, ArrowUpRight, Activity, Zap, Target, TrendingUp, Plus, ChevronRight, UserCog, ClipboardCheck, Clock } from 'lucide-react';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import StatCard from '../components/dashboard/StatCard';
import { parseISO, format } from 'date-fns'; 
import { getWorkingDays } from '../utils/dateCalculations';

// ===============================================
// DASHBOARD COMPONENT
// ===============================================

const Dashboard = () => {
  const navigate = useNavigate();
  const [projectPage, setProjectPage] = useState(1);

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

  // Autonex most-active user + project (this month, by time spent on Encord).
  const { data: autonexOverview } = useQuery({
    queryKey: ['autonex-overview'],
    queryFn: analyticsApi.getAutonexOverview,
    refetchInterval: 10 * 60 * 1000,
  });
  const topUsers = autonexOverview?.top_users || [];
  const topActiveProjects = autonexOverview?.top_projects || [];

  // Stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.project_status === 'active').length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;
  const allocatedEmployeeIds = new Set(allocations.map(a => a.employee_id));

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const employeesOnLeave = leaves.filter(leave => {
    if (!leave.start_date || !leave.end_date || leave.status === 'rejected') return false;
    return leave.start_date <= todayStr && leave.end_date >= todayStr;
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

  // Delivery risks are now driven by PM-set project sentiment: any active project
  // marked "Poor" is considered at risk.
  const atRiskProjects = projects.filter(p => p.project_status === 'active' && p.sentiment === 'Poor');

  // ── People breakdowns (active employees only) ──────────────────────────────
  const isPmDesig = (d) => (d || '').toLowerCase().includes('program manager') || (d || '').toLowerCase().includes('project manager');
  const isReviewerAnnotator = (d) => {
    const s = (d || '').toLowerCase();
    return s.includes('annotator') || s.includes('reviewer');
  };
  const activeEmployeesList = employees.filter(e => e.status === 'active');
  const typeBreakdown = (list) => {
    const norm = (t) => (t || '').toLowerCase();
    return [
      { label: 'Full-time', value: list.filter(e => norm(e.employee_type) === 'full-time').length },
      { label: 'Interns', value: list.filter(e => norm(e.employee_type) === 'intern').length },
      { label: 'Contract', value: list.filter(e => norm(e.employee_type) === 'contract' || norm(e.employee_type) === 'contractor').length },
    ];
  };
  const projectManagers = activeEmployeesList.filter(e => isPmDesig(e.designation));
  const reviewersAnnotators = activeEmployeesList.filter(e => isReviewerAnnotator(e.designation));
  const teamAvailable = activeEmployees - employeesOnLeave.length;


  // Project sentiment badge (PM-set): GOOD / AVG / Poor.
  const SentimentBadge = ({ sentiment }) => {
    const config = {
      GOOD: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'GOOD' },
      AVG: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', label: 'AVG' },
      Poor: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', label: 'Poor' },
    };
    const c = config[sentiment];
    if (!c) return <span className="text-xs text-slate-400 dark:text-zinc-600">Not set</span>;
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${c.bg} ${c.text}`}>{c.label}</span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-zinc-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-zinc-500 text-[13px] mt-0.5">Resource allocation & project insights</p>
      </div>

      {/* ===== KPI Cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard
          title="Active Projects"
          value={activeProjects}
          icon={FolderKanban}
          tone="emerald"
          hint={`of ${totalProjects} total`}
          onClick={() => navigate('/admin/sub-projects?status=active')}
        />
        <StatCard
          title="Delivery Risks"
          value={atRiskProjects.length}
          icon={AlertTriangle}
          tone="rose"
          hint={atRiskProjects.length > 0 ? 'need attention' : 'all clear'}
          onClick={() => navigate('/admin/sub-projects')}
        />
        <StatCard
          title="Project Managers"
          value={projectManagers.length}
          icon={UserCog}
          tone="violet"
          hint="program managers"
          breakdown={typeBreakdown(projectManagers)}
          onClick={() => navigate('/admin/employees')}
        />
        <StatCard
          title="Reviewers / Annotators"
          value={reviewersAnnotators.length}
          icon={ClipboardCheck}
          tone="sky"
          hint="annotators & reviewers"
          breakdown={typeBreakdown(reviewersAnnotators)}
          onClick={() => navigate('/admin/employees')}
        />
        <StatCard
          title="Team Available"
          value={teamAvailable}
          icon={Users}
          tone="amber"
          hint={`${employeesOnLeave.length} on leave`}
          breakdown={typeBreakdown(activeEmployeesList)}
          onClick={() => navigate('/admin/employees')}
        />
      </div>

      {/* Row 2: Project Status table + Top Performers side panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Project Status */}
        <div className="lg:col-span-2">
          <Table
            variant="v1"
            title="Project Status"
            count={`${projectAnalyses.length} projects`}
            headerAction={
              <Button variant="link" onClick={() => navigate('/admin/sub-projects')}>
                View all <ChevronRight className="w-4 h-4" />
              </Button>
            }
            loading={projectsLoading}
            rowClassName={() => 'group'}
            currentPage={projectPage}
            pageSize={5}
            onPageChange={setProjectPage}
            columns={[
                    {
                      key: 'project',
                      label: 'Project',
                      render: (project) => (
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-800 dark:text-zinc-200">{project.name}</div>
                          <div className="truncate text-xs text-slate-400 dark:text-zinc-500">{project.client}</div>
                        </div>
                      ),
                    },
                    {
                      key: '_sentiment',
                      label: 'Sentiment',
                      align: 'left',
                      width: 'w-32',
                      render: (_, row) => <SentimentBadge sentiment={row.project.sentiment} />,
                    },
            ]}
            data={projectAnalyses}
            emptyState={{ title: 'No projects', description: 'Active projects will appear here' }}
          />
        </div>

        {/* Most Active — Autonex users & projects (Encord, this month) */}
        <div className="space-y-4">
          {/* Most Active User */}
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-[#0f0f0f]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">Most Active Autonex Users</h3>
              <span className="text-xs text-slate-400">By hours</span>
            </div>
            {topUsers.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No activity yet</div>
            ) : (
              <ul className="divide-y divide-slate-100 px-3 dark:divide-neutral-800">
                {topUsers.map((u, idx) => (
                  <li key={u.user_email} className="flex items-center gap-3 rounded-lg px-2 py-2.5">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${['bg-amber-100 text-amber-700','bg-slate-100 text-slate-600','bg-orange-100 text-orange-700'][idx] || 'bg-slate-50 text-slate-500'}`}>{idx + 1}</span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-zinc-200">{u.employee_name || u.user_email}</p>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"><Clock className="h-3 w-3" />{u.hours}h</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Most Active Project */}
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:bg-[#0f0f0f]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">Most Active Projects</h3>
              <span className="text-xs text-slate-400">By hours</span>
            </div>
            {topActiveProjects.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No activity yet</div>
            ) : (
              <ul className="divide-y divide-slate-100 px-3 dark:divide-neutral-800">
                {topActiveProjects.map((p, idx) => (
                  <li
                    key={p.encord_project_hash}
                    onClick={() => p.project_id && navigate(`/admin/analytics/${p.project_id}`)}
                    className={`flex items-center gap-3 rounded-lg px-2 py-2.5 ${p.project_id ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]' : ''}`}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${['bg-amber-100 text-amber-700','bg-slate-100 text-slate-600','bg-orange-100 text-orange-700'][idx] || 'bg-slate-50 text-slate-500'}`}>{idx + 1}</span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-zinc-200">{p.name}</p>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><Clock className="h-3 w-3" />{p.hours}h</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
