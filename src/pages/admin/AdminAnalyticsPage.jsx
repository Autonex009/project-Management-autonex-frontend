import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trophy, Clock, Target, Download, Loader2 } from 'lucide-react';
import { onboardingApi } from '../../services/api';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await onboardingApi.exportReports();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autonex_candidates_report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    onboardingApi.getFullAnalytics()
      .then(json => {
         if (json && json.kpis) {
           json.kpis[0].icon = Trophy;
           json.kpis[0].color = '#F59E0B'; json.kpis[0].bg = '#fffbeb';
           
           if (json.kpis[1]) {
             json.kpis[1].icon = Target;
             json.kpis[1].color = '#10B981'; json.kpis[1].bg = '#ecfdf5';
           }
           if (json.kpis[2]) {
             json.kpis[2].icon = Clock;
             json.kpis[2].color = '#3B82F6'; json.kpis[2].bg = '#eff6ff';
           }
         }
         setData(json);
      })
      .catch(err => {
        console.error('Analytics fetch error:', err);
        setError(err.message || 'Failed to load analytics data');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-650" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-10 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-md mx-auto">
          <p className="font-bold text-red-700 mb-1">Failed to load analytics</p>
          <p className="text-xs text-red-500 font-mono">{error || 'No data returned from server'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-650 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { kpis = [], weeklyData = [], distribution = [] } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Platform Analytics</h2>
          <p className="text-sm text-slate-500">Track onboarding performance and engagement metrics.</p>
        </div>
        <button 
          onClick={handleExport} 
          disabled={exporting} 
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:bg-indigo-700 shadow-md disabled:opacity-50 bg-indigo-600"
        >
          <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export Report'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon || Trophy;
          return (
            <div 
              key={kpi.label} 
              className="bg-white p-5 sm:p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60"
            >
              <div className="flex items-start justify-between">
                <div 
                  className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0 bg-indigo-50" 
                  style={{ background: kpi.bg, color: kpi.color }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  (kpi.trend || '').startsWith('+') 
                    ? 'bg-green-150 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-650 border border-red-100'
                }`}>
                  {kpi.trend}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold text-slate-900">{kpi.value}</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 min-w-0 overflow-hidden">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Weekly Completions</h3>
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="completion" stroke="#1E40AF" strokeWidth={3} dot={{ r: 4, fill: '#1E40AF', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/60 min-w-0 overflow-hidden">
          <h3 className="text-lg font-bold text-slate-900 mb-2 sm:mb-6">Progress Distribution</h3>
          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={distribution} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={100} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-2">
            {distribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-[10px] sm:text-xs font-semibold text-slate-650 whitespace-nowrap">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
