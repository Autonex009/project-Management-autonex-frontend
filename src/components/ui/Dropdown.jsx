import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";

const optionLabel = (opt) => (typeof opt === "string" ? opt : (opt?.label ?? ""));

const Dropdown = ({
  options = [],
  value,
  onChange,
  placeholder = "Select",
  disabled = false,
  className = "",
  editable = false,
  allowCreate = true,
  optionsClassName = "w-full",
  defaultOpen = false,
  // Adds a filter box above the option list. Unlike `editable` this stays a plain
  // select — the trigger keeps showing the selected option's *label*, so it is safe
  // for option lists whose value differs from its label (e.g. an id).
  searchable = false,
  searchPlaceholder = "Search...",
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [searchText, setSearchText] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    document.addEventListener("pointerdown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("pointerdown", handler);
    };
  }, []);

  // When mounted already-open (e.g. auto-opened on a tab switch), scroll it
  // into view so the options are visible inside the scrollable modal body.
  useEffect(() => {
    if (defaultOpen && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open && editable && inputRef.current) {
      inputRef.current.focus();
    }
    if (open && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, editable, searchable]);

  // A stale query would silently hide options the next time the list opens.
  useEffect(() => {
    if (!open && searchable) setSearchText("");
  }, [open, searchable]);

  const displayValue = options.find(
    (opt) => (typeof opt === "string" ? opt : opt.value) === value,
  )
    ? typeof options.find(
        (opt) => (typeof opt === "string" ? opt : opt.value) === value,
      ) === "string"
      ? options.find(
          (opt) => (typeof opt === "string" ? opt : opt.value) === value,
        )
      : options.find(
          (opt) => (typeof opt === "string" ? opt : opt.value) === value,
        )?.label
    : placeholder;

  const filteredOptions = editable
    ? options.filter((opt) => {
        const label = typeof opt === "string" ? opt : opt.label;
        return label.toLowerCase().includes(searchText.toLowerCase());
      })
    : options;

  const query = searchable ? searchText.trim().toLowerCase() : "";
  const searchedOptions = query
    ? options.filter((opt) => optionLabel(opt).toLowerCase().includes(query))
    : options;

  const handleSelect = (optValue) => {
    onChange(optValue);
    setOpen(false);
    setSearchText("");
  };

  if (editable) {
    const displayText = searchText !== "" ? searchText : value || "";

    return (
      <div ref={ref} className={`relative block ${className}`}>
        <div 
          onClick={(e) => {
            // If they clicked the input itself, let the input's own events handle it
            if (e.target === inputRef.current) return;
            if (open) {
              setOpen(false);
            } else {
              setOpen(true);
              inputRef.current?.focus();
            }
          }}
          className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm transition-colors hover:border-slate-300 cursor-text"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={displayText}
            onChange={(e) => {
              setSearchText(e.target.value);
              if (e.target.value === "") {
                onChange("");
              }
              setOpen(true);
            }}
            onClick={(e) => {
               // Allow input click to just open if closed, or let user place cursor if open
               if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            className="flex-1 outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
          />
          {displayText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setSearchText("");
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="p-0.5 flex-shrink-0 focus:outline-none"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        {open && !disabled && (
          <div
            className={`absolute left-0 top-full mt-1 z-[9999] ${optionsClassName} bg-white border border-slate-200 rounded-xl shadow-lg py-1 overflow-hidden max-h-64 overflow-y-auto`}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const optValue = typeof opt === "string" ? opt : opt.value;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                if (optValue === "") return null;
                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(optValue);
                      setSearchText("");
                      setOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-sm whitespace-normal transition-colors ${
                      optValue === value
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {optLabel}
                  </button>
                );
              })
            ) : searchText ? (
              allowCreate ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange(searchText);
                    setSearchText("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  Create "{searchText}"
                </button>
              ) : (
                <div className="px-3 py-2 text-sm text-slate-400">
                  No matches found
                </div>
              )
            ) : (
              <div className="px-3 py-2 text-sm text-slate-400">No options</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative block ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          !disabled && setOpen((o) => !o);
        }}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="truncate whitespace-nowrap">{displayValue}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 pointer-events-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && !disabled && (
        <div
          className={`absolute left-0 top-full mt-1 z-[9999] ${optionsClassName} bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden`}
        >
          {searchable && (
            <div className="border-b border-slate-100 p-1.5">
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchText}
                  placeholder={searchPlaceholder}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setOpen(false);
                    }
                  }}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchText("");
                      searchRef.current?.focus();
                    }}
                    className="p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {searchedOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">
                {query ? "No matches" : "No options"}
              </div>
            ) : (
              searchedOptions.map((opt) => {
                const optValue = typeof opt === "string" ? opt : opt.value;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(optValue);
                      setSearchText("");
                      setOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-sm whitespace-normal transition-colors ${
                      optValue === value
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {optLabel}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
