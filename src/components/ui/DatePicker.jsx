import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  isBefore,
} from "date-fns";

function getISOWeekString(date) {
  if (!date) return "";
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function parseDateInput(val, type = "date") {
  if (!val) return null;
  if (val instanceof Date) return isValid(val) ? val : null;
  if (typeof val === "string") {
    if (type === "month") {
      const d = parse(val, "yyyy-MM", new Date());
      return isValid(d) ? d : null;
    }
    if (type === "week" && val.includes("-W")) {
      const [year, week] = val.split("-W");
      const y = parseInt(year, 10);
      const w = parseInt(week, 10);
      const simple = new Date(y, 0, 1 + (w - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      return ISOweekStart;
    }
    const d = parseISO(val);
    return isValid(d) ? d : null;
  }
  return null;
}

const ACCENT_STYLES = {
  emerald: {
    selected: "bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30",
    inRangeBg: "bg-emerald-100/70",
    inRangeText: "text-emerald-900",
    today: "bg-emerald-50 text-emerald-700 font-semibold",
    triggerOpen: "border-emerald-500 ring-4 ring-emerald-500/15 bg-white text-slate-900 font-medium",
    iconOpen: "text-emerald-600",
  },
  purple: {
    selected: "bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30",
    inRangeBg: "bg-purple-100/70",
    inRangeText: "text-purple-900",
    today: "bg-purple-50 text-purple-700 font-semibold",
    triggerOpen: "border-purple-500 ring-4 ring-purple-500/15 bg-white text-slate-900 font-medium",
    iconOpen: "text-purple-600",
  },
  indigo: {
    selected: "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30",
    inRangeBg: "bg-indigo-100/70",
    inRangeText: "text-indigo-900",
    today: "bg-indigo-50 text-indigo-700 font-semibold",
    triggerOpen: "border-indigo-500 ring-4 ring-indigo-500/15 bg-white text-slate-900 font-medium",
    iconOpen: "text-indigo-600",
  },
  blue: {
    selected: "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30",
    inRangeBg: "bg-blue-100/70",
    inRangeText: "text-blue-900",
    today: "bg-blue-50 text-blue-700 font-semibold",
    triggerOpen: "border-blue-500 ring-4 ring-blue-500/15 bg-white text-slate-900 font-medium",
    iconOpen: "text-blue-600",
  },
  red: {
    selected: "bg-red-700 text-white font-semibold shadow-md shadow-red-700/30",
    inRangeBg: "bg-red-100/70",
    inRangeText: "text-red-900",
    today: "bg-red-50 text-red-700 font-semibold",
    triggerOpen: "border-red-500 ring-4 ring-red-500/15 bg-white text-slate-900 font-medium",
    iconOpen: "text-red-600",
  },
};
ACCENT_STYLES.success = ACCENT_STYLES.emerald;
ACCENT_STYLES.green = ACCENT_STYLES.emerald;
ACCENT_STYLES.primary = ACCENT_STYLES.indigo;
ACCENT_STYLES.wfh = ACCENT_STYLES.purple;

export default function DatePicker({
  type = "date", // "date", "month", or "range"
  value,
  startDate,
  endDate,
  minDate,
  maxDate,
  onChange,
  onRangeChange,
  className = "",
  error = false,
  placeholder,
  name,
  required,
  accentColor = "emerald",
  customTrigger,
  disableFuture = false,
  ...props
}) {
  const accent = ACCENT_STYLES[accentColor] || ACCENT_STYLES.emerald;
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  const actualValue = value !== undefined ? value : internalValue;

  // Single date parsing
  const parsedDate = parseDateInput(actualValue, type);

  // Range date parsing
  const initialRangeStart = parseDateInput(startDate || (typeof value === "object" ? value?.startDate || value?.start_date : null));
  const initialRangeEnd = parseDateInput(endDate || (typeof value === "object" ? value?.endDate || value?.end_date : null));

  const [rangeStart, setRangeStart] = useState(initialRangeStart);
  const [rangeEnd, setRangeEnd] = useState(initialRangeEnd);

  useEffect(() => {
    if (type === "range") {
      setRangeStart(parseDateInput(startDate || (typeof value === "object" ? value?.startDate || value?.start_date : null)));
      setRangeEnd(parseDateInput(endDate || (typeof value === "object" ? value?.endDate || value?.end_date : null)));
    }
  }, [startDate, endDate, value, type]);

  const parsedMinDate = parseDateInput(minDate, type);
  const parsedMaxDate = parseDateInput(maxDate || (disableFuture ? new Date() : null), type);

  const [currentView, setCurrentView] = useState(
    parsedDate || rangeStart || new Date()
  );

  // Reset view when opening or when value string changes externally
  useEffect(() => {
    if (isOpen) {
      if (parsedDate) setCurrentView(parsedDate);
      else if (rangeStart) setCurrentView(rangeStart);
    }
  }, [isOpen, parsedDate, rangeStart]);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverHeight = type === "month" ? 220 : 320;
    const popoverWidth = type === "month" ? 250 : 292;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top;
    if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
      // Auto flip upwards if space below is limited
      top = rect.top + window.scrollY - popoverHeight - 8;
    } else {
      top = rect.bottom + window.scrollY + 6;
    }

    let left = rect.left + window.scrollX;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - popoverWidth - 16);
    }

    setPopoverPos({ top, left });
  };

  // Position calculation with auto-flip and boundary checks
  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) return;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, type]);

  const handleToggleOpen = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const isDayDisabled = (day) => {
    if (parsedMinDate) {
      const minStart = new Date(parsedMinDate.getFullYear(), parsedMinDate.getMonth(), parsedMinDate.getDate());
      const targetDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      if (targetDay < minStart) return true;
    }
    if (parsedMaxDate) {
      const maxEnd = new Date(parsedMaxDate.getFullYear(), parsedMaxDate.getMonth(), parsedMaxDate.getDate());
      const targetDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      if (targetDay > maxEnd) return true;
    }
    return false;
  };

  const handleSelectDate = (date) => {
    if (isDayDisabled(date)) return;

    if (type === "range") {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start selection
        setRangeStart(date);
        setRangeEnd(null);
      } else {
        // End selection
        if (isBefore(date, rangeStart)) {
          // If clicked date is before rangeStart, reset rangeStart to this earlier date
          setRangeStart(date);
          setRangeEnd(null);
        } else {
          // Complete valid range
          setRangeEnd(date);
          const sFormatted = format(rangeStart, "yyyy-MM-dd");
          const eFormatted = format(date, "yyyy-MM-dd");

          const rangeObj = {
            startDate: sFormatted,
            endDate: eFormatted,
            start_date: sFormatted,
            end_date: eFormatted,
          };

          if (onRangeChange) onRangeChange(rangeObj);
          if (onChange) onChange({ target: { name, value: rangeObj } });

          setIsOpen(false);
        }
      }
      return;
    }

    if (type === "week") {
      const formatted = getISOWeekString(date);
      if (value === undefined) setInternalValue(formatted);
      if (onChange) onChange({ target: { name, value: formatted } });
      setIsOpen(false);
      return;
    }

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

  const isInRange = (day) => {
    if (type === "week") {
      const targetWeek = parsedDate ? getISOWeekString(parsedDate) : (isOpen && hoverDate ? getISOWeekString(hoverDate) : null);
      if (!targetWeek) return false;
      return getISOWeekString(day) === targetWeek;
    }
    if (type !== "range" || !rangeStart) return false;
    const end = rangeEnd || (isOpen && hoverDate && !isBefore(hoverDate, rangeStart) ? hoverDate : null);
    if (!end) return false;
    const target = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const sTime = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime();
    const eTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return target >= sTime && target <= eTime;
  };

  const isRangeStart = (day) => {
    if (type === "week") {
      const targetWeek = parsedDate ? getISOWeekString(parsedDate) : (isOpen && hoverDate ? getISOWeekString(hoverDate) : null);
      return targetWeek && getISOWeekString(day) === targetWeek && day.getDay() === 1;
    }
    return type === "range" && rangeStart && isSameDay(day, rangeStart);
  };

  const isRangeEnd = (day) => {
    if (type === "week") {
      const targetWeek = parsedDate ? getISOWeekString(parsedDate) : (isOpen && hoverDate ? getISOWeekString(hoverDate) : null);
      return targetWeek && getISOWeekString(day) === targetWeek && day.getDay() === 0;
    }
    return type === "range" && (rangeEnd ? isSameDay(day, rangeEnd) : hoverDate && !isBefore(hoverDate, rangeStart) && isSameDay(day, hoverDate));
  };

  const renderDays = () => {
    const monthStart = startOfMonth(currentView);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const isWeekType = type === "week";

    return (
      <div className={isWeekType ? "w-[296px]" : "w-[260px]"}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
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

        {/* Instructions indicator for range mode */}
        {type === "range" && (
          <div className="mb-2 text-center text-[11px] font-medium text-slate-500 bg-slate-50 py-1 rounded-md border border-slate-100">
            {!rangeStart
              ? "Select start date"
              : !rangeEnd
                ? "Select end date"
                : "Range selected"}
          </div>
        )}

        {/* Weekdays */}
        <div className={`grid ${isWeekType ? "grid-cols-8" : "grid-cols-7"} mb-2`}>
          {isWeekType && (
            <div className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-r border-slate-100 pr-1 mr-1">
              Wk
            </div>
          )}
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
        <div 
          className={`grid ${isWeekType ? "grid-cols-8" : "grid-cols-7"} gap-y-1`}
          onMouseLeave={() => setHoverDate(null)}
        >
          {(() => {
            let currentDay = startDate;
            const dayEls = [];
            while (currentDay <= endDate) {
              const cloneDay = currentDay;
              
              if (isWeekType && cloneDay.getDay() === 0) {
                  // Assume Thursday determines the ISO week number, so cloneDay + 4 days is safely in that ISO week
                  const isoWeekStr = getISOWeekString(addDays(cloneDay, 4));
                  const [, wNum] = isoWeekStr.split("-W");
                  const isWeekSelected = parsedDate && isoWeekStr === getISOWeekString(parsedDate);
                  const isWeekHovered = hoverDate && isoWeekStr === getISOWeekString(hoverDate);
                  dayEls.push(
                     <div key={`wk-${isoWeekStr}`} className="flex justify-center items-center py-0.5 border-r border-slate-100 pr-1 mr-1">
                         <button 
                            type="button"
                            onClick={() => handleSelectDate(addDays(cloneDay, 4))}
                            onMouseEnter={() => setHoverDate(addDays(cloneDay, 4))}
                            className={`w-7 h-7 flex justify-center items-center rounded-md ${isWeekSelected ? accent.selected : (isWeekHovered ? "bg-slate-100 text-slate-900" : "text-slate-400")} text-[11px] font-semibold transition-colors focus:outline-none`}
                         >
                            {wNum}
                         </button>
                     </div>
                  );
              }

              const isoDayStr = getISOWeekString(cloneDay);
              
              let rStart = false;
              let rEnd = false;
              let inRange = false;
              let isSelected = false;
              let isHoveredRow = false;
              
              if (isWeekType) {
                const selectedIso = parsedDate ? getISOWeekString(parsedDate) : null;
                const hoveredIso = hoverDate ? getISOWeekString(hoverDate) : null;
                
                const isThisWeekSelected = selectedIso && isoDayStr === selectedIso;
                const isThisWeekHovered = hoveredIso && isoDayStr === hoveredIso;
                
                rStart = cloneDay.getDay() === 1;
                rEnd = cloneDay.getDay() === 0;
                
                if (isThisWeekSelected) {
                  inRange = true;
                  isSelected = true; // Makes all circles solid
                } else if (isThisWeekHovered) {
                  isHoveredRow = true;
                }
              } else {
                rStart = isRangeStart(cloneDay);
                rEnd = isRangeEnd(cloneDay);
                inRange = isInRange(cloneDay);
                isSelected = parsedDate && isSameDay(cloneDay, parsedDate);
              }

              const disabled = isDayDisabled(cloneDay);
              const isCurrentMonth = isSameMonth(cloneDay, monthStart);
              const isToday = isSameDay(cloneDay, new Date());

              dayEls.push(
                <div
                  key={cloneDay.toISOString()}
                  className={`flex justify-center py-0.5 ${
                      inRange && !disabled ? accent.inRangeBg : (isHoveredRow && !disabled ? "bg-slate-100" : "")
                    } ${rStart && (inRange || isHoveredRow) ? "rounded-l-full" : ""} ${rEnd && (inRange || isHoveredRow) ? "rounded-r-full" : ""}`}
                  onMouseEnter={() => (type === "range" || type === "week") && setHoverDate(cloneDay)}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => handleSelectDate(cloneDay)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-[13px] transition-all focus:outline-none ${disabled
                        ? "text-slate-300 cursor-not-allowed bg-transparent hover:bg-transparent"
                        : (type !== "week" && (rStart || rEnd)) || isSelected
                          ? accent.selected
                          : inRange || isHoveredRow
                            ? accent.inRangeText
                            : isToday
                              ? accent.today
                              : isCurrentMonth
                                ? "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                                : "text-slate-300 hover:bg-slate-100"
                      }`}
                  >
                    {format(cloneDay, "d")}
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
                className={`py-2 text-[13px] rounded-xl transition-all focus:outline-none ${isSelected
                    ? accent.selected
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
  if (type === "range") {
    if (rangeStart && rangeEnd) {
      displayValue = `${format(rangeStart, "dd MMM")} – ${format(rangeEnd, "dd MMM yyyy")}`;
    } else if (rangeStart) {
      displayValue = `${format(rangeStart, "dd MMM yyyy")} – Select end date`;
    }
  } else if (type === "week" && actualValue) {
    const [y, w] = actualValue.split("-W");
    displayValue = `Week ${w}, ${y}`;
  } else if (parsedDate) {
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
          value={
            type === "range"
              ? JSON.stringify({
                startDate: rangeStart ? format(rangeStart, "yyyy-MM-dd") : "",
                endDate: rangeEnd ? format(rangeEnd, "yyyy-MM-dd") : "",
              })
              : actualValue || ""
          }
          required={required}
        />
      )}

      {/* Trigger Button */}
      {customTrigger ? (
        <div onClick={handleToggleOpen} className="inline-block cursor-pointer">
          {customTrigger({ isOpen, displayValue })}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleToggleOpen}
          className={`w-full h-9 pl-9 pr-3 rounded-lg border text-[13px] text-left transition-all shadow-sm focus:outline-none flex items-center justify-between ${error
              ? "border-red-400 bg-red-50 text-red-700 focus:ring-4 focus:ring-red-500/10"
              : isOpen
                ? accent.triggerOpen
                : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:text-slate-900"
            }`}
          {...props}
        >
          <div
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${isOpen ? accent.iconOpen : "text-slate-400"
              }`}
          >
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className={displayValue ? "" : "text-slate-400"}>
            {displayValue ||
              placeholder ||
              (type === "range"
                ? "Select leave dates"
                : type === "week"
                  ? "Select week"
                : type === "month"
                  ? "Select month"
                  : "Select date")}
          </span>
        </button>
      )}

      {/* Popover via React Portal */}
      {isOpen &&
        popoverPos &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "absolute",
              top: `${popoverPos.top}px`,
              left: `${popoverPos.left}px`,
              zIndex: 99999,
            }}
            className="p-4 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_16px_48px_-12px_rgba(0,0,0,0.18)] animate-in fade-in zoom-in-95 duration-150"
          >
            {type === "month" ? renderMonths() : renderDays()}
          </div>,
          document.body
        )}
    </div>
  );
}
