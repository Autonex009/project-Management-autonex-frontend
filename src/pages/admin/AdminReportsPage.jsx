import React, { useState, useEffect } from 'react';
import { Download, Users, TrendingUp, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import { onboardingApi } from '../../services/api';
import Table from '../../components/ui/Table';
import SearchBar from '../../components/ui/SearchBar';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    onboardingApi.getReports()
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    onboardingApi.exportReports()
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `autonex_candidates_report.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch(err => {
        console.error('Export failed:', err);
        alert('Export failed');
      });
  };

  const filteredReports = reports.filter(r => 
    (r.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (userId) => {
    setExpandedRow(expandedRow === userId ? null : userId);
  };

  useEffect(() => {
    setExpandedRow(null);
  }, [currentPage]);

  const renderModuleBreakdown = (row) => (
    <div className="bg-slate-50/70 px-6 sm:px-10 py-4 border-t border-slate-100 transition-all duration-300">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Per-Module Breakdown</p>
      {row.moduleStats?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {row.moduleStats.map((ms) => (
            <div key={ms.moduleId} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-800 truncate mb-2">{ms.moduleTitle}</p>
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-500">Progress</span>
                <span className="font-bold text-slate-700">{ms.progress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden mb-3 bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${ms.progress}%`,
                    background: ms.progress === 100 ? '#10B981' : '#1d3989',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500">Quiz Score</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                    ms.score >= 70
                      ? 'bg-green-50 text-green-700'
                      : ms.score >= 40
                      ? 'bg-amber-50 text-amber-700'
                      : ms.totalQuestions === 0
                      ? 'bg-slate-50 text-slate-400'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {ms.totalQuestions === 0 ? 'No quiz' : `${ms.score}%`}
                </span>
              </div>
              {ms.totalQuestions > 0 && (
                <div className="flex items-center justify-between text-xs mt-1.5 font-medium">
                  <span className="text-slate-500">Marks</span>
                  <span className="font-bold text-slate-700">{ms.correctAnswers}/{ms.totalQuestions}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 text-sm">No module data available.</div>
      )}
    </div>
  );

  const columns = [
  {
    key: 'expand',
    label: '',
    align: 'center',
    render: (_, row) => {
      if (!row.moduleStats?.length) return null;

      return expandedRow === row.userId ? (
        <ChevronDown className="h-4 w-4 text-indigo-600 inline-block" />
      ) : (
        <ChevronRight className="h-4 w-4 text-slate-400 inline-block" />
      );
    },
  },

  {
    key: 'name',
    label: 'Candidate',
    render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold bg-indigo-600">
          {row.name
            ? row.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
            : 'C'}
        </div>

        <div>
          <p className="text-sm font-bold text-slate-800">
            {row.name}
          </p>

          <p className="text-xs text-slate-500">
            {row.email}
          </p>
        </div>
      </div>
    ),
  },

  {
    key: 'department',
    label: 'Department',
    render: (_, row) => (
      <span className="inline-flex bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border border-slate-200">
        {row.department || 'Annotator'}
      </span>
    ),
  },

  {
    key: 'overallProgress',
    label: 'Progress',
    align: 'center',
    render: (value) => (
      <div className="flex flex-col items-center gap-1">
        <span className="font-bold">
          {value}%
        </span>

        <div className="w-24 h-1.5 rounded-full overflow-hidden bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{
              width: `${value}%`,
              background:
                value === 100
                  ? '#10B981'
                  : '#1d3989',
            }}
          />
        </div>
      </div>
    ),
  },

  {
    key: 'overallScore',
    label: 'Quiz Score',
    align: 'center',
    render: (value) => (
      <span
        className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full border ${
          value >= 70
            ? 'bg-green-50 text-green-700 border-green-100'
            : value >= 40
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-red-50 text-red-600 border-red-100'
        }`}
      >
        {value}%
      </span>
    ),
  },

  {
    key: 'marks',
    label: 'Marks',
    align: 'center',
    render: (_, row) => (
      <>
        <span className="inline-flex items-center gap-1 text-sm font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
          {row.correctAnswers}/{row.totalQuestions}
        </span>

        {row.attemptedQuestions > 0 &&
          row.attemptedQuestions < row.totalQuestions && (
            <p className="text-[11px] text-amber-600 mt-1 font-semibold">
              {row.totalQuestions -
                row.attemptedQuestions}{' '}
              unattempted
            </p>
          )}
      </>
    ),
  },
];

  return (
    
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Candidate Reports</h1>
          <p className="text-sm text-slate-500">Track company-wide onboarding progress and quiz scores in one place.</p>
        </div>
        <Button size="lg" onClick={handleExportCSV} className="font-semibold">
          <Download className="h-4 w-4 " /> Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-slate-500">Total Candidates</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{reports.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl"><CheckCircle2 className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-slate-500">Avg Overall Progress</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {reports.length > 0 ? Math.round(reports.reduce((a, b) => a + (b.overallProgress || 0), 0) / reports.length) : 0}%
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl"><TrendingUp className="h-5 w-5" /></div>
            <p className="text-sm font-semibold text-slate-500">Avg Quiz Score</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">
             {reports.length > 0 ? Math.round(reports.reduce((a, b) => a + (b.overallScore || 0), 0) / reports.length) : 0}%
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <SearchBar
            placeholder="Search candidate..."
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            className="max-w-sm w-full"
          />
          <p className="text-xs text-slate-400 font-medium">Click a row to see per-module quiz breakdown</p>
        </div>

        <Table
          columns={columns}
          data={filteredReports}
          loading={loading}
          currentPage={currentPage}
          pageSize={10}
          onPageChange={setCurrentPage}
          variant="borderless"
          onRowClick={(row) => toggleExpand(row.userId)}
          expandedRowId={expandedRow}
          getRowId={(row) => row.userId}
          skeletonRows={6}
          emptyState={{
            title: 'No candidates found',
            description: 'Try adjusting your search query',
          }}
          renderExpandedRow={renderModuleBreakdown}
        />
      </div>
    </div>
  );
}
