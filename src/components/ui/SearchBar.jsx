import { Search, X } from "lucide-react";

const SIZES = {
  sm: "py-1.5 text-sm rounded-lg",
  md: "py-2 text-sm rounded-xl",
};

const SearchBar = ({
  value = "",
  onChange,
  placeholder = "Search...",
  className = "",
  width = "w-52",
  size = "md",
  responsive = false,
  clearable = false,
  disabled = false,
  autoFocus = false,
}) => {
  const wrapperWidth = responsive ? "" : width;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div
      className={`relative ${responsive ? "flex-1 sm:flex-none" : ""} ${wrapperWidth} ${className}`
        .replace(/\s+/g, " ")
        .trim()}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
        className={[
          "w-full",
          responsive ? "sm:w-64" : "",
          "pl-9",
          clearable && value ? "pr-10" : "pr-4",
          sizeClass,
          "bg-white border border-slate-200",
          "placeholder:text-slate-400",
          "outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-indigo-300",
          "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
          "transition-all shadow-sm",
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
