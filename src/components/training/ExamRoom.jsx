import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  Eye,
  ShieldAlert,
} from "lucide-react";
import Button from "../ui/Button";

/**
 * The MCQ exam room, shared by the real candidate sitting (CandidateExamPage) and the admin
 * "Preview as candidate" (ProctoredTestRoomModal), so the two can never drift apart.
 *
 * Purely presentational. Answers and the clock belong to the parent; this component owns only
 * navigation state (which question is open, which were visited, which are marked for review).
 *
 * Fixed-height test-platform layout: header on top; on the left the top-left section tabs, one
 * calm question sheet (fitting normal MCQs with no scroll) and a pinned action bar; on the right
 * the invigilator rail (camera, palette, submit).
 */

/**
 * Groups questions into sections (one per MCQ group). `sectionOrder` pins the order sections are
 * shown in (the blueprint order); without it they follow first appearance.
 */
export function groupIntoSections(questions, sectionOrder) {
  const bySection = new Map();
  (sectionOrder || []).forEach((name) => bySection.set(name, []));
  (questions || []).forEach((q) => {
    const name = q.category_name || "Questions";
    if (!bySection.has(name)) bySection.set(name, []);
    bySection.get(name).push(q);
  });
  const sections = [];
  const ordered = [];
  bySection.forEach((qs, name) => {
    if (qs.length === 0) return;
    sections.push({ name, start: ordered.length, count: qs.length });
    qs.forEach((q, i) => ordered.push({ ...q, _section: name, _number: i + 1 }));
  });
  return { sections, ordered };
}

export const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

// One meaning per colour: green answered, amber seen but skipped, indigo marked, grey untouched.
const TONE = {
  answered: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70",
  answeredMarked: "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700",
  marked: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/70",
  skipped: "bg-white text-slate-800 border-amber-300 hover:bg-amber-50/60",
  fresh: "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
};

const LEGEND = [
  { key: "answered", label: "Answered", dot: "bg-emerald-500" },
  { key: "skipped", label: "Not answered", dot: "bg-amber-400" },
  { key: "marked", label: "Marked", dot: "bg-indigo-500" },
  { key: "fresh", label: "Not visited", dot: "bg-slate-300" },
];

const KEYCAP =
  "min-w-5 h-5 px-1 inline-flex items-center justify-center rounded border border-slate-200 bg-white text-[11px] text-slate-600";

// Shared horizontal measure for the question card inside the fluid workspace
const COLUMN = "w-full max-w-3xl mx-auto";

export default function ExamRoom({
  title,
  eyebrow,
  chips = [],
  previewBanner = "",
  questions,
  sectionOrder,
  answers,
  onSelect,
  onClear,
  activeIndex,
  onActiveIndexChange,
  onSaveAndNext,
  secondsLeft,
  onSubmit,
  submitting = false,
  submitLabel = "Submit test",
  banner = "",
  bannerTone = "warn",
  rail = null,
  onExit,
  exitLabel = "Exit preview",
}) {
  // Key on the order's content: callers often pass a fresh array each render
  const orderKey = (sectionOrder || []).join("\u0001");
  const { sections, ordered } = useMemo(
    () => groupIntoSections(questions, orderKey ? orderKey.split("\u0001") : undefined),
    [questions, orderKey]
  );
  const total = ordered.length;
  const index = Math.min(Math.max(0, activeIndex || 0), Math.max(0, total - 1));
  const current = ordered[index];

  const [marked, setMarked] = useState(() => new Set());
  const [visited, setVisited] = useState(() => new Set());

  useEffect(() => {
    if (!current) return;
    setVisited((prev) => (prev.has(current.question_id) ? prev : new Set(prev).add(current.question_id)));
  }, [current]);

  // Arrow keys move between questions (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") onActiveIndexChange(Math.min(total - 1, index + 1));
      if (e.key === "ArrowLeft") onActiveIndexChange(Math.max(0, index - 1));
      // A-D or 1-4 pick the matching option
      const pos = /^[a-z]$/i.test(e.key)
        ? e.key.toUpperCase().charCodeAt(0) - 65
        : /^[1-9]$/.test(e.key)
          ? Number(e.key) - 1
          : -1;
      const q = ordered[index];
      if (q && pos >= 0 && pos < (q.options || []).length) onSelect(q.question_id, pos);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, ordered, onSelect, onActiveIndexChange]);

  const isAnswered = (q) => answers?.[q.question_id] !== undefined;
  const stateOf = (q) => {
    const answered = isAnswered(q);
    const isMarked = marked.has(q.question_id);
    if (answered && isMarked) return "answeredMarked";
    if (isMarked) return "marked";
    if (answered) return "answered";
    if (visited.has(q.question_id)) return "skipped";
    return "fresh";
  };

  const counts = useMemo(() => {
    const c = { answered: 0, skipped: 0, marked: 0, fresh: 0 };
    ordered.forEach((q) => {
      const st = stateOf(q);
      if (st === "answered") c.answered += 1;
      else if (st === "answeredMarked") {
        c.answered += 1;
        c.marked += 1;
      } else if (st === "marked") c.marked += 1;
      else if (st === "skipped") c.skipped += 1;
      else c.fresh += 1;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered, answers, marked, visited]);

  if (!current) return null;

  const section = sections.find((s) => s.name === current._section) || sections[0];
  const go = (i) => onActiveIndexChange(Math.min(Math.max(0, i), total - 1));
  const isLast = index === total - 1;
  const isMarked = marked.has(current.question_id);

  const toggleMark = () =>
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(current.question_id)) next.delete(current.question_id);
      else next.add(current.question_id);
      return next;
    });

  const handleSaveAndNext = () => {
    onSaveAndNext?.();
    if (isLast) onSubmit?.();
    else go(index + 1);
  };

  const handleMarkAndNext = () => {
    setMarked((prev) => new Set(prev).add(current.question_id));
    onSaveAndNext?.();
    if (!isLast) go(index + 1);
  };

  const urgent = typeof secondsLeft === "number" && secondsLeft <= 120;
  const sectionAnswered = (s) =>
    ordered.slice(s.start, s.start + s.count).filter(isAnswered).length;
  const marks = Number(current.marks || 1);
  const progressPct = total > 0 ? Math.round((counts.answered / total) * 100) : 0;

  return (
    <div className="min-h-screen lg:h-[100dvh] bg-slate-50 flex flex-col lg:overflow-hidden text-slate-900">
      {previewBanner ? (
        <div className="shrink-0 h-7 px-6 bg-slate-100 border-b border-slate-200 text-slate-600 text-xs flex items-center justify-center gap-2">
          <Eye className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.5} />
          <span>{previewBanner}</span>
        </div>
      ) : null}

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-slate-200 h-14 px-6 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-slate-900 truncate">{title}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{eyebrow}</span>
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className={`inline-flex items-center gap-1.5 ${
                    chip.tone === "ok"
                      ? "text-emerald-600"
                      : chip.tone === "danger"
                        ? "text-rose-600 font-medium"
                        : chip.tone === "warn"
                          ? "text-amber-700 font-medium"
                          : "text-slate-500"
                  }`}
                >
                  <span className="text-slate-300">·</span>
                  {chip.icon ? <chip.icon className="h-3.5 w-3.5" strokeWidth={1.5} /> : null}
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {typeof secondsLeft === "number" && (
            <div
              className={`flex items-center gap-2 h-8 px-3 rounded-lg border transition-colors ${
                urgent
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "border-transparent text-slate-900"
              }`}
              aria-label="Time left"
            >
              <Clock
                className={`h-4 w-4 ${urgent ? "text-rose-600" : "text-slate-400"}`}
                strokeWidth={1.5}
              />
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-500 hidden sm:inline">Time left</span>
                <span
                  className={`text-[15px] font-medium tabular-nums ${
                    urgent ? "text-rose-700" : "text-slate-900"
                  }`}
                >
                  {formatClock(secondsLeft)}
                </span>
              </div>
            </div>
          )}
          {onExit && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg shadow-none text-xs"
              onClick={onExit}
            >
              {exitLabel}
            </Button>
          )}
        </div>
      </header>

      {banner ? (
        <div
          className={`shrink-0 px-6 py-2 text-xs font-medium flex items-center justify-center gap-2 border-b ${
            bannerTone === "info"
              ? "bg-indigo-50 border-indigo-200 text-indigo-800"
              : bannerTone === "danger"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {bannerTone !== "info" && (
            <ShieldAlert
              className={`h-4 w-4 ${bannerTone === "danger" ? "text-rose-600" : "text-amber-600"}`}
              strokeWidth={1.5}
            />
          )}
          {banner}
        </div>
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left: top-left section tabs, scrolling question sheet, pinned action bar */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-slate-50 lg:border-r border-slate-200">
          {sections.length > 1 && (
            <nav
              className="shrink-0 bg-white border-b border-slate-200 px-6 h-12 flex items-center justify-between gap-4"
              aria-label="Sections"
            >
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg overflow-x-auto overflow-y-hidden">
                {sections.map((s) => {
                  const active = s.name === section.name;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => go(s.start)}
                      aria-current={active ? "true" : undefined}
                      className={`h-7 px-3 rounded-md inline-flex items-center gap-2 text-sm whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
                        active
                          ? "bg-white text-slate-900 font-medium shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <span>{s.name}</span>
                      <span
                        className={`text-xs tabular-nums ${
                          active ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        {sectionAnswered(s)}/{s.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden sm:flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-500 tabular-nums">
                  {counts.answered} of {total} answered
                </span>
                <div className="w-32 h-1 rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
                  <div
                    className="h-full bg-indigo-600 transition-[width] duration-200"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </nav>
          )}

          {/* Question sheet — compact enough that normal MCQs fit cleanly with zero scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-h-full flex flex-col justify-center pb-8">
              <div className={`${COLUMN} bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs tabular-nums">
                    <span className="font-medium text-slate-500">
                      Question {current._number} of {section.count}
                    </span>
                    {isMarked && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium">
                        <Bookmark className="h-3 w-3" strokeWidth={1.5} />
                        Marked
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {marks} {marks === 1 ? "mark" : "marks"}
                  </span>
                </div>

                <p className="text-lg font-medium text-slate-900 leading-7">
                  {current.question}
                </p>

                <div className="space-y-2.5" role="radiogroup" aria-label="Answer options">
                  {(current.options || []).map((opt, idx) => {
                    const selected = answers?.[current.question_id] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onSelect(current.question_id, idx)}
                        className={`w-full text-left px-4 py-3 rounded-[10px] border text-[15px] leading-6 transition-colors duration-150 flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
                          selected
                            ? "border-indigo-600 bg-indigo-50/40 text-slate-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md border text-xs font-medium flex items-center justify-center shrink-0 transition-colors duration-150 ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className={`${COLUMN} mt-3 hidden lg:flex items-center justify-center gap-4 text-xs text-slate-500`}>
                <span className="inline-flex items-center gap-1.5">
                  <kbd className={KEYCAP}>A</kbd>
                  <span className="text-slate-400">to</span>
                  <kbd className={KEYCAP}>{String.fromCharCode(64 + Math.max(2, (current.options || []).length))}</kbd>
                  choose
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <kbd className={KEYCAP}>←</kbd>
                  <kbd className={KEYCAP}>→</kbd>
                  change question
                </span>
              </p>
            </div>
          </div>

          {/* Pinned bottom action bar — aligned across all question heights */}
          <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-3">
            <div className={`${COLUMN} flex flex-wrap items-center justify-between gap-3`}>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-lg text-[13px] font-medium shadow-none"
                  onClick={isMarked ? toggleMark : handleMarkAndNext}
                  title={isMarked ? "Remove the review mark" : "Mark this question and move to the next"}
                >
                  <Bookmark className="h-4 w-4" strokeWidth={1.5} />
                  {isMarked ? "Remove mark" : "Mark for review & next"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-lg text-[13px] font-medium shadow-none"
                  disabled={!isAnswered(current)}
                  onClick={() => onClear(current.question_id)}
                >
                  <Eraser className="h-4 w-4" strokeWidth={1.5} />
                  Clear response
                </Button>
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="md"
                  className="h-9 px-4 rounded-lg shadow-none"
                  disabled={index <= 0}
                  onClick={() => go(index - 1)}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                  Previous
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="h-9 px-5 rounded-lg min-w-[140px] shadow-none"
                  disabled={submitting}
                  onClick={handleSaveAndNext}
                >
                  {isLast ? "Save & review" : "Save & next"}
                  {!isLast && <ChevronRight className="h-4 w-4" strokeWidth={1.5} />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: invigilator rail — camera, status legend, palette, submit */}
        <aside className="lg:w-80 shrink-0 min-h-0 flex flex-col bg-white">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {rail}

            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {LEGEND.map((l) => (
                <li key={l.key} className="flex items-center gap-2 text-[13px] text-slate-600">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${l.dot}`} aria-hidden="true" />
                  <span className="whitespace-nowrap">{l.label}</span>
                  <span className="tabular-nums font-medium text-slate-900">{counts[l.key]}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-4 pt-4 border-t border-slate-200">
              {sections.map((s) => (
                <div key={s.name} className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`truncate ${
                        s.name === section.name ? "font-medium text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {s.name}
                    </span>
                    <span className="text-slate-500 tabular-nums">
                      {sectionAnswered(s)}/{s.count}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {ordered.slice(s.start, s.start + s.count).map((q, i) => {
                      const globalIdx = s.start + i;
                      const isCurrent = globalIdx === index;
                      return (
                        <button
                          key={q.question_id}
                          type="button"
                          onClick={() => go(globalIdx)}
                          aria-label={`${s.name} question ${q._number}`}
                          aria-current={isCurrent ? "true" : undefined}
                          className={`h-9 rounded-lg text-[13px] font-medium tabular-nums border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
                            TONE[stateOf(q)]
                          } ${isCurrent ? "!border-indigo-600 ring-1 ring-indigo-600 font-semibold" : ""}`}
                        >
                          {q._number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 space-y-2">
            <Button
              variant="outline"
              className="w-full h-10 rounded-lg border-slate-300 bg-white text-slate-900 hover:bg-slate-50 font-medium shadow-none"
              disabled={submitting}
              onClick={onSubmit}
            >
              {submitLabel}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
