import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkinApi } from "../../services/api";
import UserAvatar from "../ui/UserAvatar";
import Dropdown from "../ui/Dropdown";
import { formatDisplayName } from "../../utils/displayName";
import { Building2, Home } from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "../ui/DatePicker";

// Helper to get week start and end from YYYY-Www string
function getWeekRange(weekStr) {
  const [year, week] = weekStr.split("-W");
  const y = parseInt(year, 10);
  const w = parseInt(week, 10);
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  
  const start = new Date(ISOweekStart);
  const end = new Date(ISOweekStart);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

// Generate all YYYY-MM strings between two dates
function getMonthsBetween(start, end) {
  const months = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= last) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${y}-${m}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

// Generate array of date objects between start and end
function getDaysArray(start, end) {
  const arr = [];
  let dt = new Date(start);
  while (dt <= end) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
}

const HistoryMatrix = ({ role = "admin" }) => {
  const today = new Date();
  
  // States for filter
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'custom'
  
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [monthVal, setMonthVal] = useState(currentMonthStr);
  
  // Calculate current week string (e.g. 2026-W36)
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  const currentWeekStr = `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  
  const [weekVal, setWeekVal] = useState(currentWeekStr);
  
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Determine active date range
  const dateRange = useMemo(() => {
    if (viewMode === "month" && monthVal) {
      const [y, m] = monthVal.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0); // last day of month
      return { start, end };
    }
    if (viewMode === "week" && weekVal) {
      return getWeekRange(weekVal);
    }
    if (viewMode === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      // Validate 90 days max
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        toast.error("Custom range cannot exceed 90 days for performance.");
        return null;
      }
      return { start, end };
    }
    return null;
  }, [viewMode, monthVal, weekVal, customStart, customEnd]);

  const targetMonths = useMemo(() => {
    if (!dateRange) return [];
    return getMonthsBetween(dateRange.start, dateRange.end);
  }, [dateRange]);

  const fetchMatrix = async () => {
    if (!targetMonths.length) return [];
    const fetcher = role === "admin" ? checkinApi.getAdminMatrix : checkinApi.getTeamMatrix;
    
    // Fetch all required months concurrently
    const promises = targetMonths.map(m => fetcher(m));
    const results = await Promise.all(promises);
    
    // Merge results
    const empMap = {};
    results.forEach(res => {
      res.rows.forEach(row => {
        if (!empMap[row.employee_id]) {
          empMap[row.employee_id] = { ...row, checkinsByDate: {} };
        }
        // Map day strings to YYYY-MM-DD
        Object.keys(row.checkins).forEach(dayStr => {
          const paddedDay = dayStr.padStart(2, '0');
          const fullDate = `${res.month_year}-${paddedDay}`;
          empMap[row.employee_id].checkinsByDate[fullDate] = row.checkins[dayStr];
        });
      });
    });
    
    return Object.values(empMap).sort((a, b) => a.name.localeCompare(b.name));
  };

  const { data: matrixData, isLoading, isError } = useQuery({
    queryKey: ["matrix-history", role, targetMonths.join(",")],
    queryFn: fetchMatrix,
    enabled: targetMonths.length > 0,
    staleTime: 60 * 1000,
  });

  const displayDays = useMemo(() => {
    if (!dateRange) return [];
    return getDaysArray(dateRange.start, dateRange.end);
  }, [dateRange]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1">Timeframe</label>
          <Dropdown
            value={viewMode}
            onChange={(v) => setViewMode(v)}
            placeholder="Select timeframe"
            options={[
              { value: "month", label: "Monthly" },
              { value: "week", label: "Weekly" },
              { value: "custom", label: "Custom Range" }
            ]}
          />
        </div>
        
        {viewMode === "month" && (
          <div className="w-48">
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Month</label>
            <DatePicker 
              type="month"
              value={monthVal}
              onChange={(e) => setMonthVal(e.target.value)}
              accentColor="indigo"
            />
          </div>
        )}
        
        {viewMode === "week" && (
          <div className="w-48">
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Week</label>
            <DatePicker 
              type="week"
              value={weekVal}
              onChange={(e) => setWeekVal(e.target.value)}
              accentColor="indigo"
            />
          </div>
        )}
        
        {viewMode === "custom" && (
          <div className="w-64">
            <label className="block text-xs font-medium text-slate-500 mb-1">Date Range</label>
            <DatePicker
              type="range"
              startDate={customStart}
              endDate={customEnd}
              onRangeChange={(range) => {
                if (range.startDate) setCustomStart(range.startDate);
                if (range.endDate) setCustomEnd(range.endDate);
              }}
              accentColor="indigo"
            />
          </div>
        )}
      </div>

      {/* Matrix Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading matrix...</div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500">Failed to load matrix data.</div>
        ) : !dateRange ? (
          <div className="p-12 text-center text-slate-500">Please select a valid date range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3 font-semibold text-slate-900 border-r border-slate-200">
                    Employee
                  </th>
                  {displayDays.map((d, i) => {
                    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                    const dateNum = d.getDate();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th key={i} className={`px-2 py-3 text-center border-r border-slate-200 ${isWeekend ? 'bg-slate-100' : ''}`}>
                        <div className="text-xs font-normal text-slate-500">{dayName}</div>
                        <div className="font-semibold text-slate-900">{dateNum}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(matrixData || []).map((row) => (
                  <tr key={row.employee_id} className="hover:bg-slate-50">
                    <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 px-4 py-2 border-r border-slate-200">
                      <div className="flex items-center gap-2">
                        <UserAvatar src={row.avatar_url} name={row.name} size="w-6 h-6 text-[10px]" />
                        <span className="font-medium text-slate-800">{formatDisplayName(row.name)}</span>
                      </div>
                    </td>
                    {displayDays.map((d, i) => {
                      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      const cell = row.checkinsByDate[dateKey];
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      
                      return (
                        <td key={i} className={`px-1 py-1 text-center border-r border-slate-200 ${isWeekend ? 'bg-slate-50' : ''}`}>
                          {cell ? (
                            <div title={`${cell.mode} at ${cell.time}`} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cell.mode === 'WFH' ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700'}`}>
                              {cell.mode === 'WFH' ? <Home className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                              {cell.time}
                            </div>
                          ) : (
                            <span className="text-slate-200 text-xs">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {(!matrixData || matrixData.length === 0) && (
                  <tr>
                    <td colSpan={displayDays.length + 1} className="p-8 text-center text-slate-500">
                      No data found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryMatrix;
