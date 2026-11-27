// Shared field styles for the module builder and its section cards.
// Slate neutrals, indigo only for focus. One height, one radius, one border.

const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 " +
  "hover:border-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 " +
  "transition-colors disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:border-slate-200";

export const FIELD = `h-9 ${fieldBase}`;
export const TEXTAREA = `py-2 leading-6 resize-y ${fieldBase}`;
export const LABEL = "mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-slate-700";
export const HINT = "mt-1.5 text-xs text-slate-500";
export const Required = () => (
  <span className="ml-0.5 text-rose-500" aria-hidden="true">*</span>
);

/** Small neutral text button, e.g. "Add question". */
export const GHOST_BTN =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-slate-600 " +
  "transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30";

/** Icon-only button that turns red on hover, for destructive actions. */
export const DELETE_ICON_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 " +
  "transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30";
