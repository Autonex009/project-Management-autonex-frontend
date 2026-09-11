import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export const MultiSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = "Select...",
  className = "",
  searchable,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const ref = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const toggleOption = (optValue) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleSelectAll = () => {
    const allVals = options.map((o) => o.value);
    if (value.length === options.length) {
      onChange([]);
    } else {
      onChange(allVals);
    }
  };

  const selectedOptions = options.filter((o) => value.includes(o.value));
  const isAllSelected = options.length > 0 && selectedOptions.length === options.length;

  const showSearch = searchable ?? options.length > 5;

  const filteredOptions = options.filter((opt) =>
    (opt.label || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTriggerContent = () => {
    if (!value || value.length === 0) {
      return <span className="text-slate-500 truncate">{placeholder}</span>;
    }
    if (value.length === 1) {
      const single = selectedOptions[0];
      return (
        <span className="text-indigo-700 font-medium truncate">
          {single ? single.label : placeholder}
        </span>
      );
    }
    return (
      <span className="text-indigo-700 font-semibold truncate text-xs bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
        {value.length} selected
      </span>
    );
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none bg-white flex items-center justify-between min-h-[38px] hover:border-slate-300 transition-colors text-sm text-left cursor-pointer"
      >
        <div className="flex items-center gap-1 min-w-0 flex-1 pr-1">
          {renderTriggerContent()}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {value && value.length > 0 && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[9999] left-0 mt-1 min-w-[200px] w-full bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col overflow-hidden">
          {showSearch && (
            <div className="p-2 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {options.length > 2 && (
            <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                {isAllSelected ? "Deselect All" : "Select All"}
              </button>
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Clear ({value.length})
                </button>
              )}
            </div>
          )}

          <div className="overflow-y-auto py-1 max-h-60">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs transition-colors ${
                      checked ? "bg-indigo-50/40 text-indigo-900 font-medium" : "text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(opt.value)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
