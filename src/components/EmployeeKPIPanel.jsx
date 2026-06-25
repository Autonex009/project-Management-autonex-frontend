import { useState, useMemo } from 'react';
import { 
    Search, ArrowUpDown, Calendar, Home, Award, TrendingUp, 
    AlertTriangle, ShieldAlert, FileText, CheckCircle, Clock, X,
    ChevronRight, BarChart2, ChevronDown, ChevronUp, Users
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getWorkingDayCount, getLeaveTypeLabel, toLocalISODate, isIntern } from '../utils/leaveTypes';

const MONTH_OPTIONS = [
    { value: 'all', label: 'All Time' },
    { value: '2026-01', label: 'January 2026' },
    { value: '2026-02', label: 'February 2026' },
    { value: '2026-03', label: 'March 2026' },
    { value: '2026-04', label: 'April 2026' },
    { value: '2026-05', label: 'May 2026' },
    { value: '2026-06', label: 'June 2026' },
    { value: '2026-07', label: 'July 2026' },
    { value: '2026-08', label: 'August 2026' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-10', label: 'October 2026' },
    { value: '2026-11', label: 'November 2026' },
    { value: '2026-12', label: 'December 2026' },
];

const EmployeeKPIPanel = ({ employees = [], leaves = [], wfhRequests = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
    const [sortBy, setSortBy] = useState('reliability'); // 'name', 'leaves', 'wfh', 'reliability'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
    const [selectedMonth, setSelectedMonth] = useState('2026-06'); // Default to current workspace active month
    const [selectedType, setSelectedType] = useState('all'); // 'all', 'full-time', 'intern'

    // Calculate month boundary dates
    const monthBoundary = useMemo(() => {
        if (selectedMonth === 'all') return null;
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${selectedMonth}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        return { startDate, endDate };
    }, [selectedMonth]);

    // Compute stats for all active scoped employees
    const employeeStats = useMemo(() => {
        return employees.map(emp => {
            // Find all leaves for this employee
            const empLeaves = leaves.filter(l => l.employee_id === emp.id);
            const approvedLeaves = empLeaves.filter(l => l.status === 'approved');
            const pendingLeaves = empLeaves.filter(l => l.status === 'pending');

            // Calculate approved & pending leave days overlapping the selected month
            let approvedLeaveDays = 0;
            let pendingLeaveDays = 0;
            let approvedFlaggedCount = 0;
            let pendingFlaggedCount = 0;

            const typeBreakdown = {
                paid: 0,
                casual_sick: 0,
                floater: 0,
                first_half: 0,
                second_half: 0
            };

            approvedLeaves.forEach(l => {
                let days = 0;
                if (!l.start_date || !l.end_date) {
                    if (selectedMonth === 'all') {
                        days = l.is_half_day ? 0.5 : 1.0;
                    }
                } else if (selectedMonth === 'all') {
                    days = getWorkingDayCount(l.start_date, l.end_date, l.is_half_day);
                } else if (monthBoundary) {
                    const { startDate: mStart, endDate: mEnd } = monthBoundary;
                    // Check if leave overlaps selected month
                    if (l.start_date <= mEnd && l.end_date >= mStart) {
                        const overlapStart = l.start_date < mStart ? mStart : l.start_date;
                        const overlapEnd = l.end_date > mEnd ? mEnd : l.end_date;
                        days = getWorkingDayCount(overlapStart, overlapEnd, l.is_half_day);
                    }
                }

                if (days > 0) {
                    approvedLeaveDays += days;
                    const type = l.leave_type || 'other';
                    typeBreakdown[type] = (typeBreakdown[type] || 0) + days;
                    if (l.flagged) {
                        approvedFlaggedCount++;
                    }
                }
            });

            pendingLeaves.forEach(l => {
                let days = 0;
                if (!l.start_date || !l.end_date) {
                    if (selectedMonth === 'all') {
                        days = l.is_half_day ? 0.5 : 1.0;
                    }
                } else if (selectedMonth === 'all') {
                    days = getWorkingDayCount(l.start_date, l.end_date, l.is_half_day);
                } else if (monthBoundary) {
                    const { startDate: mStart, endDate: mEnd } = monthBoundary;
                    // Check if leave overlaps selected month
                    if (l.start_date <= mEnd && l.end_date >= mStart) {
                        const overlapStart = l.start_date < mStart ? mStart : l.start_date;
                        const overlapEnd = l.end_date > mEnd ? mEnd : l.end_date;
                        days = getWorkingDayCount(overlapStart, overlapEnd, l.is_half_day);
                    }
                }

                if (days > 0) {
                    pendingLeaveDays += days;
                    if (l.flagged) {
                        pendingFlaggedCount++;
                    }
                }
            });

            const totalFlaggedCount = approvedFlaggedCount + pendingFlaggedCount;

            // Find WFH requests for this employee in the selected month
            const empWfh = wfhRequests.filter(w => w.employee_id === emp.id);
            let filteredWfh = empWfh;
            if (selectedMonth !== 'all' && monthBoundary) {
                const { startDate: mStart, endDate: mEnd } = monthBoundary;
                filteredWfh = empWfh.filter(w => w.wfh_date >= mStart && w.wfh_date <= mEnd);
            }

            const approvedWfhCount = filteredWfh.filter(w => w.status === 'approved').length;
            const pendingWfhCount = filteredWfh.filter(w => w.status === 'pending').length;

            // Calculate reliability score (starts at 100)
            // Deduction: -5% per approved leave day, -15% per approved flagged leave.
            // WFH does not penalize reliability since it is remote work, but is displayed as a usage metric.
            let reliabilityScore = 100 - (approvedLeaveDays * 5) - (approvedFlaggedCount * 15);
            reliabilityScore = Math.max(0, Math.min(100, Math.round(reliabilityScore)));

            // Categorize rating and insights
            let rating = 'Excellent';
            let ratingColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
            let ratingDot = 'bg-emerald-500';
            let performanceAdvice = 'Outstanding attendance. Perfect availability for critical deliverable paths.';

            if (reliabilityScore < 50) {
                rating = 'Review Recommended';
                ratingColor = 'text-red-700 bg-red-50 border-red-200';
                ratingDot = 'bg-red-500';
                performanceAdvice = 'High absenteeism has significantly impacted attendance. Review schedule alignment and check for policy compliance.';
            } else if (reliabilityScore < 75) {
                rating = 'Moderate Presence';
                ratingColor = 'text-amber-700 bg-amber-50 border-amber-200';
                ratingDot = 'bg-amber-500';
                performanceAdvice = 'Moderate leave count. Ensure project milestones have clear handovers and backups assigned.';
            } else if (reliabilityScore < 90) {
                rating = 'Good Presence';
                ratingColor = 'text-blue-700 bg-blue-50 border-blue-200';
                ratingDot = 'bg-blue-500';
                performanceAdvice = 'Healthy work attendance. Leave utilization is within expected parameters.';
            } else if (approvedLeaveDays > 0) {
                performanceAdvice = 'Strong attendance record. Minimal leave interruptions.';
            }

            if (totalFlaggedCount > 0) {
                performanceAdvice = `${performanceAdvice} Note: Has leave requests exceeding limits. HR policy review recommended.`;
            }

            return {
                employee: emp,
                approvedLeaveDays,
                pendingLeaveDays,
                approvedWfhCount,
                pendingWfhCount,
                flaggedCount: totalFlaggedCount,
                approvedFlaggedCount,
                reliabilityScore,
                rating,
                ratingColor,
                ratingDot,
                performanceAdvice,
                typeBreakdown,
                allEmpLeaves: empLeaves,
                allEmpWfh: empWfh
            };
        });
    }, [employees, leaves, wfhRequests, selectedMonth, monthBoundary]);

    // Overall team dashboard stats
    const overallStats = useMemo(() => {
        if (employeeStats.length === 0) {
            return { avgLeaves: 0, totalLeaves: 0, highAbsenteeism: 0, totalWfh: 0 };
        }
        const totalLeaves = employeeStats.reduce((acc, s) => acc + s.approvedLeaveDays, 0);
        const totalWfh = employeeStats.reduce((acc, s) => acc + s.approvedWfhCount, 0);
        const avgLeaves = (totalLeaves / employeeStats.length).toFixed(1);
        const highAbsenteeism = employeeStats.filter(s => s.reliabilityScore < 75).length;

        return {
            avgLeaves,
            totalLeaves: totalLeaves.toFixed(1).replace(/\.0$/, ''),
            highAbsenteeism,
            totalWfh
        };
    }, [employeeStats]);

    // Sorting & Filtering
    const sortedAndFilteredStats = useMemo(() => {
        return employeeStats
            .filter(item => {
                const q = searchQuery.toLowerCase();
                const name = item.employee.name.toLowerCase();
                const designation = (item.employee.designation || '').toLowerCase();
                const dept = (item.employee.department || '').toLowerCase();
                const matchesSearch = name.includes(q) || designation.includes(q) || dept.includes(q);
                if (!matchesSearch) return false;

                if (selectedType === 'full-time') {
                    return !isIntern(item.employee.employee_type);
                }
                if (selectedType === 'intern') {
                    return isIntern(item.employee.employee_type);
                }
                return true;
            })
            .sort((a, b) => {
                let valA, valB;
                if (sortBy === 'name') {
                    valA = a.employee.name.toLowerCase();
                    valB = b.employee.name.toLowerCase();
                    return sortOrder === 'asc' 
                        ? valA.localeCompare(valB) 
                        : valB.localeCompare(valA);
                }
                
                if (sortBy === 'leaves') {
                    valA = a.approvedLeaveDays;
                    valB = b.approvedLeaveDays;
                } else if (sortBy === 'wfh') {
                    valA = a.approvedWfhCount;
                    valB = b.approvedWfhCount;
                } else {
                    valA = a.reliabilityScore;
                    valB = b.reliabilityScore;
                }

                if (valA === valB) {
                    // Secondary sort alphabetically by name
                    return a.employee.name.toLowerCase().localeCompare(b.employee.name.toLowerCase());
                }

                return sortOrder === 'asc' ? valA - valB : valB - valA;
            });
    }, [employeeStats, searchQuery, sortBy, sortOrder, selectedType]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const selectedEmployeeStats = useMemo(() => {
        if (!selectedEmployeeId) return null;
        return employeeStats.find(s => s.employee.id === selectedEmployeeId);
    }, [employeeStats, selectedEmployeeId]);

    // Sort order visualizer indicator
    const renderSortIcon = (field) => {
        if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-45 shrink-0" />;
        return sortOrder === 'asc' 
            ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-indigo-600 shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 ml-1 text-indigo-600 shrink-0" />;
    };

    return (
        <div className="space-y-6">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="inline-flex p-2 rounded-xl bg-indigo-50 text-indigo-600 mb-3">
                        <Award className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{overallStats.avgLeaves} Days</p>
                    <p className="text-xs text-slate-400 mt-1">Average Leaves / Employee</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="inline-flex p-2 rounded-xl bg-emerald-50 text-emerald-600 mb-3">
                        <BarChart2 className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{overallStats.totalLeaves} Days</p>
                    <p className="text-xs text-slate-400 mt-1">Total Team Leave Days</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="inline-flex p-2 rounded-xl bg-orange-50 text-orange-600 mb-3">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{overallStats.highAbsenteeism} Members</p>
                    <p className="text-xs text-slate-400 mt-1">High Leave Utilization (&lt;75% presence)</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="inline-flex p-2 rounded-xl bg-blue-50 text-blue-600 mb-3">
                        <Home className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{overallStats.totalWfh} Days</p>
                    <p className="text-xs text-slate-400 mt-1">Total Work From Home Days</p>
                </div>
            </div>

            {/* List Header, Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-slate-800">Employee Presence & Reliability Scorecard</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {/* Employee Type filter dropdown */}
                    <div className="relative w-full sm:w-48">
                        <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={selectedType}
                            onChange={e => setSelectedType(e.target.value)}
                            className="w-full pl-10 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white appearance-none cursor-pointer text-slate-700 font-medium"
                        >
                            <option value="all">All Roles / Types</option>
                            <option value="full-time">Full-time</option>
                            <option value="intern">Interns / Contractors</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Month selector dropdown */}
                    <div className="relative w-full sm:w-48">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="w-full pl-10 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white appearance-none cursor-pointer text-slate-700 font-medium"
                        >
                            {MONTH_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Search query */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search employees or roles..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Scorecard Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th onClick={() => handleSort('name')} className="cursor-pointer hover:bg-slate-100/50 px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                                    <span className="flex items-center">Employee {renderSortIcon('name')}</span>
                                </th>
                                <th onClick={() => handleSort('leaves')} className="cursor-pointer hover:bg-slate-100/50 px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                                    <span className="flex items-center justify-center">Approved Leaves {renderSortIcon('leaves')}</span>
                                </th>
                                <th onClick={() => handleSort('wfh')} className="cursor-pointer hover:bg-slate-100/50 px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                                    <span className="flex items-center justify-center">Approved WFH {renderSortIcon('wfh')}</span>
                                </th>
                                <th className="px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                                    Status
                                </th>
                                <th onClick={() => handleSort('reliability')} className="cursor-pointer hover:bg-slate-100/50 px-5 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                                    <span className="flex items-center justify-center font-bold">Reliability Score {renderSortIcon('reliability')}</span>
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                                    Breakdown (PL | SL | FL)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedAndFilteredStats.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                        No employee records match the filter query.
                                    </td>
                                </tr>
                            ) : (
                                sortedAndFilteredStats.map(stat => (
                                    <tr 
                                        key={stat.employee.id} 
                                        onClick={() => setSelectedEmployeeId(stat.employee.id)}
                                        className="hover:bg-indigo-50/10 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center group-hover:from-indigo-100 group-hover:to-indigo-50 transition-colors shrink-0">
                                                    <span className="text-sm font-bold text-indigo-600">
                                                        {stat.employee.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">{stat.employee.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-slate-400">{stat.employee.designation || 'No title'}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                        <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                            {stat.employee.employee_type || 'Full-time'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center font-mono text-sm font-semibold text-slate-700">
                                            {stat.approvedLeaveDays}d
                                            {stat.pendingLeaveDays > 0 && (
                                                <span className="ml-1 text-xs font-normal text-amber-500" title="Pending approval">
                                                    (+{stat.pendingLeaveDays}d)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center font-mono text-sm text-slate-600">
                                            {stat.approvedWfhCount}d
                                            {stat.pendingWfhCount > 0 && (
                                                <span className="ml-1 text-xs text-amber-500" title="Pending approval">
                                                    (+{stat.pendingWfhCount}d)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${stat.ratingColor}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${stat.ratingDot}`}></span>
                                                {stat.rating}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`text-base font-extrabold ${
                                                    stat.reliabilityScore >= 90 ? 'text-emerald-600' :
                                                    stat.reliabilityScore >= 75 ? 'text-indigo-600' :
                                                    stat.reliabilityScore >= 50 ? 'text-amber-500' : 'text-red-500'
                                                }`}>
                                                    {stat.reliabilityScore}%
                                                </span>
                                                {stat.flaggedCount > 0 && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                                        <AlertTriangle className="w-2 h-2 shrink-0" /> {stat.flaggedCount} overlimit
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3 select-none">
                                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                                                        PL: {stat.typeBreakdown.paid || 0}d
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        SL: {stat.typeBreakdown.casual_sick || 0}d
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold font-mono bg-amber-50 text-amber-700 border border-amber-200">
                                                        FL: {stat.typeBreakdown.floater || 0}d
                                                    </span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Selected Employee Detailed Drawer */}
            {selectedEmployeeStats && (() => {
                const { employee, approvedLeaveDays, approvedWfhCount, reliabilityScore, rating, ratingColor, ratingDot, typeBreakdown, allEmpLeaves, allEmpWfh, performanceAdvice } = selectedEmployeeStats;
                
                // Group leaves/wfh logs to match the selected month if not 'all'
                const leaveList = allEmpLeaves
                    .filter(l => {
                        if (!l.start_date || !l.end_date) return false;
                        if (selectedMonth === 'all') return true;
                        if (!monthBoundary) return true;
                        const { startDate: mStart, endDate: mEnd } = monthBoundary;
                        return l.start_date <= mEnd && l.end_date >= mStart;
                    })
                    .sort((a, b) => b.start_date.localeCompare(a.start_date));

                const wfhList = allEmpWfh
                    .filter(w => {
                        if (selectedMonth === 'all') return true;
                        if (!monthBoundary) return true;
                        const { startDate: mStart, endDate: mEnd } = monthBoundary;
                        return w.wfh_date >= mStart && w.wfh_date <= mEnd;
                    })
                    .sort((a, b) => b.wfh_date.localeCompare(a.wfh_date));

                return (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
                        {/* Drawer Backdrop Overlay Click Handler */}
                        <div className="absolute inset-0" onClick={() => setSelectedEmployeeId(null)}></div>
                        
                        {/* Drawer Content */}
                        <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
                            {/* Drawer Header */}
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-505 to-indigo-600 flex items-center justify-center text-white text-lg font-bold" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                                        {employee.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg leading-snug">{employee.name}</h3>
                                        <p className="text-xs text-slate-400">{employee.designation || 'No title'} &bull; {employee.employee_type || 'Full-time'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedEmployeeId(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Drawer Body Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Reliability Score Banner */}
                                <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-100/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1 bg-transparent">
                                        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Attendance Profile & Performance Impact</p>
                                        <p className="text-sm font-semibold text-slate-800 leading-snug">{rating} Reliability ({selectedMonth === 'all' ? 'All Time' : format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')})</p>
                                        <p className="text-xs text-slate-500 mt-1">{performanceAdvice}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white border border-slate-100 shadow-sm rounded-xl px-4 py-2 self-start sm:self-auto shrink-0">
                                        <span className={`text-2xl font-black ${
                                            reliabilityScore >= 90 ? 'text-emerald-500' :
                                            reliabilityScore >= 75 ? 'text-indigo-500' :
                                            reliabilityScore >= 50 ? 'text-amber-500' : 'text-red-500'
                                        }`}>{reliabilityScore}%</span>
                                        <div className="text-left leading-none bg-transparent">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Presence</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Score</span>
                                        </div>
                                    </div>
                                </div>

                                {/* General Performance Insights Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leave Days Taken</p>
                                        <p className="text-3xl font-extrabold text-slate-800 mt-2 font-mono">{approvedLeaveDays} Days</p>
                                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-2.5">
                                            <span>Paid: {typeBreakdown.paid || 0}d</span>
                                            <span>Casual: {typeBreakdown.casual_sick || 0}d</span>
                                            <span>Float: {typeBreakdown.floater || 0}d</span>
                                        </div>
                                    </div>
                                    <div className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work From Home (WFH)</p>
                                        <p className="text-3xl font-extrabold text-slate-800 mt-2 font-mono">{approvedWfhCount} Days</p>
                                        <p className="text-xs text-slate-400 mt-3 border-t border-slate-50 pt-2.5">Approved requests: {wfhList.length}</p>
                                    </div>
                                </div>

                                {/* Leave Category Distribution Bar Chart */}
                                <div className="space-y-3 bg-transparent">
                                    <h4 className="font-bold text-slate-800 text-sm">Leave Category Distribution ({selectedMonth === 'all' ? 'All Time' : 'This Month'})</h4>
                                    <div className="border border-slate-100 rounded-xl p-4 space-y-4 bg-white">
                                        {['paid', 'casual_sick', 'floater'].map(type => {
                                             const count = typeBreakdown[type] || 0;
                                             const isEmpIntern = employee.employee_type && isIntern(employee.employee_type);
                                             const maxDays = selectedMonth === 'all'
                                                 ? (
                                                     type === 'paid' ? 12 :
                                                     type === 'casual_sick' ? (isEmpIntern ? 0 : 6) :
                                                     type === 'floater' ? (isEmpIntern ? 0 : 2) : 0
                                                   )
                                                 : (
                                                     type === 'paid' ? (isEmpIntern ? 1 : 2) :
                                                     type === 'casual_sick' ? (isEmpIntern ? 0 : 6) :
                                                     type === 'floater' ? (isEmpIntern ? 0 : 2) : 0
                                                   );

                                            const percentage = maxDays > 0 ? Math.min(100, (count / maxDays) * 100) : 0;
                                            return (
                                                <div key={type} className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                                                        <span>{getLeaveTypeLabel(type)}</span>
                                                        <span className="font-mono">{count} / {maxDays} Days {maxDays === 0 && count > 0 && '(Exceeded / Unpaid)'}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                        <div 
                                                            style={{ width: `${percentage}%` }}
                                                            className={`h-full rounded-full transition-all duration-550 ${
                                                                type === 'paid' ? 'bg-indigo-600' :
                                                                type === 'casual_sick' ? 'bg-emerald-600' : 'bg-amber-500'
                                                            }`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Leave Log History */}
                                <div className="space-y-3 bg-transparent">
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-slate-400 font-bold" />
                                        Approved/Pending Leaves ({selectedMonth === 'all' ? 'All Time' : 'This Month'})
                                    </h4>
                                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white">
                                        {leaveList.length === 0 ? (
                                            <p className="p-8 text-center text-sm text-slate-400">No leaves logged in this period.</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {leaveList.map(leave => {
                                                    // calculate overlap working days for displaying in log row
                                                    let days = 0;
                                                    if (selectedMonth === 'all') {
                                                        days = getWorkingDayCount(leave.start_date, leave.end_date, leave.is_half_day);
                                                    } else if (monthBoundary) {
                                                        const { startDate: mStart, endDate: mEnd } = monthBoundary;
                                                        const overlapStart = leave.start_date < mStart ? mStart : leave.start_date;
                                                        const overlapEnd = leave.end_date > mEnd ? mEnd : leave.end_date;
                                                        days = getWorkingDayCount(overlapStart, overlapEnd, leave.is_half_day);
                                                    }

                                                    return (
                                                        <div key={leave.leave_id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-slate-800 text-sm">
                                                                        {leave.is_half_day ? (
                                                                            <span>{format(parseISO(leave.start_date), 'MMM dd, yyyy')} ({leave.half_day_slot === 'first_half' ? 'First Half' : 'Second Half'})</span>
                                                                        ) : (
                                                                            <span>{format(parseISO(leave.start_date), 'MMM dd')} &mdash; {format(parseISO(leave.end_date), 'MMM dd, yyyy')}</span>
                                                                        )}
                                                                    </span>
                                                                    <span className="text-slate-300 font-normal text-xs">&bull;</span>
                                                                    <span className="text-xs text-indigo-600 font-medium">{getLeaveTypeLabel(leave.leave_type)}</span>
                                                                </div>
                                                                {leave.reason && (
                                                                    <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{leave.reason}&rdquo;</p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <span className="font-mono font-semibold text-sm text-slate-700 bg-slate-100 rounded px-2 py-0.5">{days}d {selectedMonth !== 'all' && `(of ${getWorkingDayCount(leave.start_date, leave.end_date, leave.is_half_day)}d)`}</span>
                                                                {leave.status === 'approved' ? (
                                                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                                ) : leave.status === 'pending' ? (
                                                                    <Clock className="w-4 h-4 text-amber-500" />
                                                                ) : (
                                                                    <X className="w-4 h-4 text-red-400" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* WFH Log History */}
                                <div className="space-y-3 bg-transparent">
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                        <Home className="w-4 h-4 text-slate-400" />
                                        WFH Request Log ({selectedMonth === 'all' ? 'All Time' : 'This Month'})
                                    </h4>
                                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white">
                                        {wfhList.length === 0 ? (
                                            <p className="p-8 text-center text-sm text-slate-400">No WFH requests logged in this period.</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {wfhList.map(wfh => (
                                                    <div key={wfh.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                                                        <div>
                                                            <p className="font-semibold text-slate-800 text-sm">
                                                                {format(new Date(wfh.wfh_date + 'T00:00:00'), 'MMM d, yyyy')}
                                                            </p>
                                                            {wfh.reason && (
                                                                <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{wfh.reason}&rdquo;</p>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0">
                                                            {wfh.status === 'approved' ? (
                                                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5">Approved</span>
                                                            ) : wfh.status === 'pending' ? (
                                                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">Pending</span>
                                                            ) : (
                                                                <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5">Rejected</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default EmployeeKPIPanel;
