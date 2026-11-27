import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import ModuleSectionCard from "./ModuleSectionCard";
import { FIELD, TEXTAREA, LABEL, HINT, GHOST_BTN, Required } from "./moduleFormStyles";
import { onboardingApi } from "../../services/api";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const newId = () => Math.random().toString(36).substring(7);

const blankSection = () => ({
  id: newId(),
  title: "",
  description: "",
  videoUrl: "",
  videoDuration: "",
  quizPassingScore: 0,
  questions: [],
});

const EMPTY_FORM = {
  title: "",
  description: "",
  assessmentUrl: "",
  status: "published",
  order: 0,
  sections: [],
};

/** Map a module from the API into the editor's form shape. */
const toForm = (data) => {
  const normalized = (data.status || "").toLowerCase();
  const known = normalized === "draft" || normalized === "published";
  if (!known) {
    // Unknown backend value — default to draft (safer than auto-publish) and say so.
    console.warn(`Unexpected module status "${data.status}"; defaulting to draft.`);
    toast.error(`Unknown status "${data.status || "empty"}", set to Draft. Check it before saving`);
  }
  return {
    title: data.title || "",
    description: data.description || "",
    assessmentUrl: data.assessment_url || "",
    status: known ? normalized : "draft",
    order: data.order ?? 0,
    sections: (data.sections || []).map((s) => ({
      id: s.id,
      title: s.title || "",
      description: s.description || "",
      videoUrl: s.video_url || "",
      videoDuration: s.video_duration || "",
      quizPassingScore: s.quiz_passing_score ?? 0,
      document: s.documents?.[0]
        ? { title: s.documents[0].title, type: s.documents[0].type, url: s.documents[0].url }
        : undefined,
      questions: (s.questions || []).map((q) => {
        let opts = [];
        try {
          opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
        } catch {
          opts = q.options || [];
        }
        return {
          id: q.id,
          question: q.question || "",
          options: opts?.length === 4 ? opts : ["", "", "", ""],
          correctIndex: q.correct_option_index ?? 0,
        };
      }),
    })),
  };
};

/** First problem in the form, or null when it can be saved. */
const firstError = (form) => {
  if (!form.title.trim()) return "Add a module title";
  if (!form.description.trim()) return "Add a module description";
  for (let i = 0; i < form.sections.length; i++) {
    const s = form.sections[i];
    if (!s.title.trim()) return `Section ${i + 1} needs a title`;
    if (!s.description.trim()) return `Section ${i + 1} needs a description`;
    const questions = s.questions || [];
    for (let j = 0; j < questions.length; j++) {
      if (!questions[j].question.trim()) return `Section ${i + 1}, question ${j + 1} needs question text`;
      if ((questions[j].options || []).some((o) => !o.trim()))
        return `Section ${i + 1}, question ${j + 1} needs all four options`;
    }
  }
  return null;
};

const toPayload = (form) => ({
  title: form.title,
  description: form.description,
  status: form.status.toUpperCase(), // 'PUBLISHED' or 'DRAFT'
  assessment_url: form.assessmentUrl || null,
  order: Number(form.order) || 0,
  sections: form.sections.map((sec, idx) => ({
    title: sec.title,
    description: sec.description,
    video_url: sec.videoUrl || null,
    video_duration: sec.videoDuration || null,
    quiz_passing_score: Number(sec.quizPassingScore) || 0,
    order: idx,
    documents: sec.document
      ? [{ title: sec.document.title, type: sec.document.type, url: sec.document.url || "#" }]
      : [],
    questions: (sec.questions || []).map((q) => ({
      question: q.question,
      options: q.options,
      correct_option_index: Number(q.correctIndex) || 0,
    })),
  })),
});

/**
 * Right-hand drawer for creating or editing an onboarding module: details,
 * status and its sections. Pass `moduleId` to edit, or null to create.
 * Calls `onSaved` after a successful save, then closes.
 */
export default function ModuleEditorDrawer({ moduleId = null, onClose, onSaved }) {
  const isEdit = Boolean(moduleId);
  const [form, setForm] = useState(EMPTY_FORM);
  const [baseline, setBaseline] = useState(() => JSON.stringify(EMPTY_FORM));
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const bodyRef = useRef(null);
  const titleRef = useRef(null);

  const dirty = !isLoading && JSON.stringify(form) !== baseline;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Slide in on mount; lock page scroll while open
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
    };
  }, []);

  // Load the module when editing
  useEffect(() => {
    if (!moduleId) {
      titleRef.current?.focus({ preventScroll: true });
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    onboardingApi
      .getModule(moduleId)
      .then((data) => {
        if (cancelled) return;
        const next = toForm(data);
        setForm(next);
        setBaseline(JSON.stringify(next));
      })
      .catch((err) => {
        console.error("Failed to load module:", err);
        toast.error("Couldn't load this module");
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  const close = () => {
    setOpen(false);
    setTimeout(onClose, 200);
  };
  const requestClose = () => {
    if (isSaving) return;
    dirty ? setConfirmDiscard(true) : close();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Sections ───────────────────────────────────────────────────────────
  const addSection = () => {
    setForm((f) => ({ ...f, sections: [...f.sections, blankSection()] }));
    requestAnimationFrame(() =>
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" })
    );
  };
  const updateSection = (next) =>
    setForm((f) => ({ ...f, sections: f.sections.map((s) => (s.id === next.id ? next : s)) }));
  const removeSection = (id) =>
    setForm((f) => ({ ...f, sections: f.sections.filter((s) => s.id !== id) }));

  // ── Save ───────────────────────────────────────────────────────────────
  const save = async () => {
    const error = firstError(form);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      setIsSaving(true);
      const payload = toPayload(form);
      if (isEdit) await onboardingApi.updateModule(moduleId, payload);
      else await onboardingApi.createModule(payload);
      toast.success(isEdit ? "Module saved" : "Module created");
      onSaved?.();
      close();
    } catch (err) {
      console.error("Error saving module:", err);
      toast.error("Couldn't save the module. Try again");
    } finally {
      setIsSaving(false);
    }
  };

  const sectionCount = form.sections.length;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-labelledby="module-editor-title">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={requestClose}
      />

      {/* Panel */}
      <section
        className={`absolute inset-y-0 right-0 flex w-full flex-col border-l border-slate-200 bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.08)] transition-transform duration-200 ease-out sm:w-[720px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6">
          <div className="min-w-0">
            <h2 id="module-editor-title" className="truncate text-base font-medium text-slate-900">
              {isEdit ? "Edit module" : "New module"}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {isLoading ? (
                "Loading"
              ) : (
                <>
                  {form.title.trim() || "Untitled"} · <span className="tabular-nums">{plural(sectionCount, "section")}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              Loading module
            </div>
          ) : (
            <div className="space-y-8 px-6 py-6">
              {/* Details */}
              <div className="space-y-5">
                <div>
                  <label htmlFor="module-title" className={LABEL}>
                    <span>
                      Title
                      <Required />
                    </span>
                  </label>
                  <input
                    ref={titleRef}
                    id="module-title"
                    type="text"
                    value={form.title}
                    onChange={(e) => set({ title: e.target.value })}
                    className={FIELD}
                    placeholder="e.g. Video annotation basics"
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="module-description" className={LABEL}>
                    <span>
                      Description
                      <Required />
                    </span>
                  </label>
                  <textarea
                    id="module-description"
                    value={form.description}
                    onChange={(e) => set({ description: e.target.value })}
                    className={TEXTAREA}
                    rows={3}
                    placeholder="What candidates will learn in this module"
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="module-assessment" className={LABEL}>
                    <span>Assessment link</span>
                    <span className="text-xs font-normal text-slate-400">Optional</span>
                  </label>
                  <input
                    id="module-assessment"
                    type="url"
                    value={form.assessmentUrl}
                    onChange={(e) => set({ assessmentUrl: e.target.value })}
                    className={FIELD}
                    placeholder="https://"
                  />
                  <p className={HINT}>Shown to candidates as a Take assessment button</p>
                </div>

                <div>
                  <p className={LABEL}>
                    <span>Status</span>
                  </p>
                  <div
                    className="inline-flex items-center rounded-lg bg-slate-100 p-0.5"
                    role="radiogroup"
                    aria-label="Status"
                  >
                    {[
                      { key: "published", label: "Published", dot: "bg-emerald-500" },
                      { key: "draft", label: "Draft", dot: "bg-amber-500" },
                    ].map((o) => {
                      const on = form.status === o.key;
                      return (
                        <button
                          key={o.key}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => set({ status: o.key })}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
                            on ? "bg-white font-medium text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          {on && <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className={HINT}>
                    {form.status === "published"
                      ? "Visible to candidates in onboarding"
                      : "Hidden from candidates until published"}
                  </p>
                </div>
              </div>

              {/* Sections */}
              <div className="border-t border-slate-100 pt-6">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">
                      Sections{" "}
                      <span className="ml-1 text-xs font-normal tabular-nums text-slate-400">{sectionCount}</span>
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Each section is a lesson with an optional video, document and quiz
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {form.sections.map((section, idx) => (
                    <ModuleSectionCard
                      key={section.id}
                      index={idx}
                      section={section}
                      onChange={updateSection}
                      onRemove={() => removeSection(section.id)}
                    />
                  ))}

                  <button
                    type="button"
                    onClick={addSection}
                    className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-[13px] font-medium text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                    {sectionCount === 0 ? "Add the first section" : "Add section"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex h-16 shrink-0 items-center justify-between gap-4 border-t border-slate-200 px-6">
          {confirmDiscard ? (
            <>
              <p className="text-[13px] text-slate-700">Discard unsaved changes?</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setConfirmDiscard(false)} className={GHOST_BTN}>
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-9 items-center rounded-lg bg-rose-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-rose-700"
                >
                  Discard
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-xs text-slate-500">
                {dirty ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
                  </>
                ) : (
                  "No changes"
                )}
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={requestClose} disabled={isSaving} className={GHOST_BTN}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={isSaving || isLoading || (isEdit && !dirty)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSaving ? "Saving" : isEdit ? "Save changes" : "Create module"}
                </button>
              </div>
            </>
          )}
        </footer>
      </section>
    </div>,
    document.body
  );
}
