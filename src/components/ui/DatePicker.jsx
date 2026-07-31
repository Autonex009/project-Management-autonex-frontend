import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  addYears,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  parseISO,
  isValid,
  parse,
  setMonth,
} from "date-fns";

export default function DatePicker({
  type = "date", // "date" or "month"
  value,
  onChange,
  className = "",
  error = false,
  placeholder,
  name,
  required,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const containerRef = useRef(null);

  const actualValue = value !== undefined ? value : internalValue;

  // Parse value to Date
  let parsedDate = null;
  if (actualValue) {
    if (type === "month") {
      const d = parse(actualValue, "yyyy-MM", new Date());
      if (isValid(d)) parsedDate = d;
    } else {
      const d = parseISO(actualValue);
      if (isValid(d)) parsedDate = d;
    }
  }

  const [currentView, setCurrentView] = useState(parsedDate || new Date());

  // Reset view when opening if value changed externally
  useEffect(() => {
    if (isOpen && parsedDate) {
      setCurrentView(parsedDate);
    }
  }, [isOpen, parsedDate]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectDate = (date) => {
    const formatted = format(date, "yyyy-MM-dd");
    if (value === undefined) setInternalValue(formatted);
    if (onChange) onChange({ target: { name, value: formatted } });
    setIsOpen(false);
  };

  const handleSelectMonth = (monthIndex) => {
    const newDate = setMonth(currentView, monthIndex);
    const formatted = format(newDate, "yyyy-MM");
    if (value === undefined) setInternalValue(formatted);
    if (onChange) onChange({ target: { name, value: formatted } });
    setIsOpen(false);
  };

  const renderDays = () => {
    const monthStart = startOfMonth(currentView);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    return (
      <div className="w-[260px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCurrentView(subMonths(currentView, 1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[14px] font-semibold text-slate-800 tracking-tight">
            {format(currentView, "MMMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setCurrentView(addMonths(currentView, 1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((wd) => (
            <div
              key={wd}
              className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-y-1">
          {(() => {
            let currentDay = startDate;
            const dayEls = [];
            while (currentDay <= endDate) {
              const cloneDay = currentDay;
              const isSelected = parsedDate && isSameDay(currentDay, parsedDate);
              const isCurrentMonth = isSameMonth(currentDay, monthStart);
              const isToday = isSameDay(currentDay, new Date());

              dayEls.push(
                <div key={cloneDay.toISOString()} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleSelectDate(cloneDay)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-[13px] transition-all focus:outline-none ${
                      isSelected
                        ? "bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20"
                        : isToday
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : isCurrentMonth
                        ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                        : "text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {format(currentDay, "d")}
                  </button>
                </div>
              );
              currentDay = addDays(currentDay, 1);
            }
            return dayEls;
          })()}
        </div>
      </div>
    );
  };

  const renderMonths = () => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    return (
      <div className="w-[220px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <button
            type="button"
            onClick={() => setCurrentView(subYears(currentView, 1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[14px] font-semibold text-slate-800 tracking-tight">
            {format(currentView, "yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setCurrentView(addYears(currentView, 1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2">
          {months.map((m, i) => {
            const isSelected =
              parsedDate &&
              parsedDate.getMonth() === i &&
              parsedDate.getFullYear() === currentView.getFullYear();
            return (
              <button
                key={m}
                type="button"
                onClick={() => handleSelectMonth(i)}
                className={`py-2 text-[13px] rounded-xl transition-all focus:outline-none ${
                  isSelected
                    ? "bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Display value formatting
  let displayValue = "";
  if (parsedDate) {
    displayValue =
      type === "month"
        ? format(parsedDate, "MMMM yyyy")
        : format(parsedDate, "dd MMM yyyy");
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Hidden input to support form submission (e.g. required validations) */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={actualValue || ""}
          required={required}
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-9 pl-9 pr-3 rounded-lg border text-[13px] text-left transition-all shadow-sm focus:outline-none flex items-center justify-between ${
          error
            ? "border-red-400 bg-red-50 text-red-700 focus:ring-4 focus:ring-red-500/10"
            : isOpen
            ? "border-blue-400 ring-4 ring-blue-500/15 bg-white text-slate-900 font-medium"
            : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:text-slate-900"
        }`}
        {...props}
      >
        <div
          className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
            isOpen ? "text-blue-500" : "text-slate-400"
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
        </div>
        <span className={displayValue ? "" : "text-slate-400"}>
          {displayValue ||
            placeholder ||
            (type === "month" ? "Select month" : "Select date")}
        </span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 p-4 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]">
          {type === "month" ? renderMonths() : renderDays()}
        </div>
      )}
    </div>
  );
}
