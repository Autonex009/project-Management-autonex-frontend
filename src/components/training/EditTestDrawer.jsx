import { createPortal } from "react-dom";
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderPlus,
  HelpCircle,
  Keyboard,
  Plus,
  Send,
  ShieldAlert,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import { assessmentApi } from "../../services/api";
import Button from "../ui/Button";
import { ui, plural } from "./trainingStyles";

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const EMPTY_QUESTION = () => ({
  question_id: uid("q"),
  question: "",
  options: ["", "", "", ""],
  correct_index: 0,
  marks: 1,
  explanation: "",
});

const EMPTY_CATEGORY = (index = 1) => ({
  category_id: uid("cat"),
  name: `Group ${index}`,
  description: "",
  pick_count: 1,
  questions: [EMPTY_QUESTION()],
});

function normalizeCategoriesFromConfig(testConfig) {
  const cats = Array.isArray(testConfig?.categories) ? testConfig.categories : [];
  if (cats.length === 0) return [EMPTY_CATEGORY(1)];
  return cats.map((cat, idx) => ({
    category_id: cat.category_id || uid(`cat${idx + 1}`),
    name: cat.name || `Group ${idx + 1}`,
    description: cat.description || "",
    pick_count: Math.max(1, Number(cat.pick_count ?? 1)),
    questions:
      Array.isArray(cat.questions) && cat.questions.length > 0
        ? cat.questions.map((q) => {
            const opts = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["", "", "", ""];
            const ci = Number(q.correct_index ?? 0);
            return {
              question_id: q.question_id || uid("q"),
              question: q.question || "",
              options: opts.map((o) => String(o ?? "")),
              correct_index: Number.isInteger(ci) && ci >= 0 && ci < opts.length ? ci : 0,
              marks: Number(q.marks ?? 1) > 0 ? Number(q.marks) : 1,
              explanation: q.explanation || "",
            };
          })
        : [],
  }));
}

function countWords(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export default function EditTestDrawer({ test, onClose }) {
  const queryClient = useQueryClient();
  const isTyping = test?.test_type === "typing";

  const [title, setTitle] = useState(test?.title || "");
  const [description, setDescription] = useState(test?.description || "");
  const [durationMinutes, setDurationMinutes] = useState(Number(test?.duration_minutes ?? 20));
  const [maxAttempts, setMaxAttempts] = useState(Number(test?.max_attempts ?? 1));
  const [passingScore, setPassingScore] = useState(
    test?.passing_score !== null && test?.passing_score !== undefined ? String(test.passing_score) : isTyping ? "" : "70"
  );

  const [requireCamera, setRequireCamera] = useState(Boolean(test?.proctoring_config?.require_camera ?? true));
  const [maxTabSwitches, setMaxTabSwitches] = useState(Number(test?.proctoring_config?.max_tab_switches ?? 3));

  // MCQ Category Pool State
  const [shuffleQuestions, setShuffleQuestions] = useState(Boolean(test?.test_config?.shuffle_questions ?? true));
  const [shuffleOptions, setShuffleOptions] = useState(Boolean(test?.test_config?.shuffle_options ?? true));
  const [categories, setCategories] = useState(() =>
    isTyping ? [] : normalizeCategoriesFromConfig(test?.test_config)
  );
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);

  // Typing Test State
  const [passageText, setPassageText] = useState(test?.test_config?.passage_text || "");
  const [targetWpm, setTargetWpm] = useState(Number(test?.test_config?.target_wpm ?? 40));
  const [minAccuracy, setMinAccuracy] = useState(Number(test?.test_config?.min_accuracy_percent ?? 90));

  const [formError, setFormError] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const poolStats = useMemo(() => {
    if (isTyping) {
      const words = countWords(passageText);
      return {
        words,
        isReady: words >= 20 && targetWpm > 0 && minAccuracy > 0,
      };
    }
    let totalPool = 0;
    let totalPick = 0;
    let allFilled = categories.length > 0;
    const issues = [];

    const seenQIds = new Set();
    categories.forEach((cat, idx) => {
      const qCount = cat.questions.length;
      const pick = Math.max(0, Number(cat.pick_count || 0));
      totalPool += qCount;
      totalPick += pick;

      if (!cat.name.trim()) {
        allFilled = false;
        issues.push(`Group #${idx + 1} needs a name`);
      }
      if (pick <= 0) {
        allFilled = false;
        issues.push(`${cat.name || `Group #${idx + 1}`}: draw count must be at least 1`);
      }
      if (qCount < pick) {
        allFilled = false;
        issues.push(`${cat.name || `Group #${idx + 1}`}: needs ${pick - qCount} more question(s) to draw ${pick}`);
      }
      cat.questions.forEach((q, qIdx) => {
        if (seenQIds.has(q.question_id)) {
          allFilled = false;
          issues.push(`Duplicate question ID in ${cat.name || `Group #${idx + 1}`}`);
        }
        seenQIds.add(q.question_id);
        if (!q.question.trim()) {
          allFilled = false;
          issues.push(`${cat.name || `Group #${idx + 1}`} Q${qIdx + 1}: prompt is empty`);
        }
        if (q.options.some((opt) => !opt.trim())) {
          allFilled = false;
          issues.push(`${cat.name || `Group #${idx + 1}`} Q${qIdx + 1}: all options must have text`);
        }
      });
    });

    return {
      categoryCount: categories.length,
      totalPool,
      totalPick,
      isReady: allFilled,
      issues,
    };
  }, [isTyping, passageText, targetWpm, minAccuracy, categories]);

  const updateMutation = useMutation({
    mutationFn: ({ payload }) => assessmentApi.update(test.id, payload),
    onSuccess: (updated, vars) => {
      queryClient.setQueryData(["assessments"], (old) => {
        if (!Array.isArray(old)) return old;
        const exists = old.some((a) => a.id === updated.id);
        return exists ? old.map((a) => (a.id === updated.id ? updated : a)) : [updated, ...old];
      });
      toast.success(
        vars.targetStatus === "published" && test.status !== "published"
          ? "Assessment saved & published"
          : vars.targetStatus === "published"
            ? "Published assessment updated"
            : "Draft saved"
      );
      onClose();
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || "Failed to update assessment.";
      setFormError(msg);
      toast.error(msg);
    },
  });

  const handleSave = (targetStatus) => {
    setFormError("");
    if (title.trim().length < 2) {
      setFormError("Assessment title must be at least 2 characters.");
      return;
    }

    const parsedDuration = Math.max(1, Math.min(240, Number(durationMinutes) || 20));
    const parsedAttempts = Math.max(1, Math.min(10, Number(maxAttempts) || 1));
    const parsedPass =
      passingScore.trim() === ""
        ? isTyping
          ? null
          : 70
        : Math.max(0, Math.min(100, Number(passingScore)));

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      duration_minutes: parsedDuration,
      max_attempts: parsedAttempts,
      passing_score: parsedPass,
      status: targetStatus,
      proctoring_config: {
        require_camera: requireCamera,
        max_tab_switches: Math.max(1, Math.min(99, Number(maxTabSwitches) || 99)),
      },
      test_config: isTyping
        ? {
            passage_text: passageText.trim(),
            target_wpm: Math.max(1, Number(targetWpm) || 40),
            min_accuracy_percent: Math.max(1, Math.min(100, Number(minAccuracy) || 90)),
          }
        : {
            mode: "category_pooled",
            shuffle_questions: shuffleQuestions,
            shuffle_options: shuffleOptions,
            categories: categories.map((cat) => ({
              category_id: cat.category_id || uid("cat"),
              name: cat.name.trim(),
              description: cat.description.trim() || undefined,
              pick_count: Math.max(1, Number(cat.pick_count) || 1),
              questions: cat.questions.map((q) => ({
                question_id: q.question_id || uid("q"),
                question: q.question.trim(),
                options: q.options.map((o) => o.trim()),
                correct_index: Number(q.correct_index) || 0,
                marks: Math.max(0.5, Number(q.marks) || 1),
                ...(q.explanation.trim() ? { explanation: q.explanation.trim() } : {}),
              })),
            })),
          },
    };

    updateMutation.mutate({ payload, targetStatus });
  };

  // --- MCQ Category & Question Manipulation ---
  const addCategory = () => {
    const next = [...categories, EMPTY_CATEGORY(categories.length + 1)];
    setCategories(next);
    setActiveCategoryIdx(next.length - 1);
  };

  const removeCategory = (idx) => {
    if (categories.length <= 1) {
      toast.error("An MCQ assessment needs at least one category group.");
      return;
    }
    const next = categories.filter((_, i) => i !== idx);
    setCategories(next);
    setActiveCategoryIdx((prev) => Math.max(0, Math.min(prev, next.length - 1)));
  };

  const updateCategoryField = (idx, field, val) => {
    setCategories((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c)));
  };

  const addQuestionToCategory = (catIdx) => {
    setCategories((prev) =>
      prev.map((c, i) => (i === catIdx ? { ...c, questions: [...c.questions, EMPTY_QUESTION()] } : c))
    );
  };

  const updateQuestionField = (catIdx, qIdx, field, val) => {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === catIdx
          ? {
              ...c,
              questions: c.questions.map((q, qi) => (qi === qIdx ? { ...q, [field]: val } : q)),
            }
          : c
      )
    );
  };

  const updateOption = (catIdx, qIdx, optIdx, val) => {
    setCategories((prev) =>
      prev.map((c, i) => {
        if (i !== catIdx) return c;
        return {
          ...c,
          questions: c.questions.map((q, qi) => {
            if (qi !== qIdx) return q;
            const opts = [...q.options];
            opts[optIdx] = val;
            return { ...q, options: opts };
          }),
        };
      })
    );
  };

  const addOption = (catIdx, qIdx) => {
    setCategories((prev) =>
      prev.map((c, i) => {
        if (i !== catIdx) return c;
        return {
          ...c,
          questions: c.questions.map((q, qi) => {
            if (qi !== qIdx || q.options.length >= 6) return q;
            return { ...q, options: [...q.options, ""] };
          }),
        };
      })
    );
  };

  const removeOption = (catIdx, qIdx, optIdx) => {
    setCategories((prev) =>
      prev.map((c, i) => {
        if (i !== catIdx) return c;
        return {
          ...c,
          questions: c.questions.map((q, qi) => {
            if (qi !== qIdx || q.options.length <= 2) return q;
            const nextOpts = q.options.filter((_, oi) => oi !== optIdx);
            const nextCorrect =
              q.correct_index >= nextOpts.length
                ? 0
                : q.correct_index === optIdx
                  ? 0
                  : q.correct_index > optIdx
                    ? q.correct_index - 1
                    : q.correct_index;
            return { ...q, options: nextOpts, correct_index: nextCorrect };
          }),
        };
      })
    );
  };

  const removeQuestion = (catIdx, qIdx) => {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === catIdx
          ? { ...c, questions: c.questions.filter((_, qi) => qi !== qIdx) }
          : c
      )
    );
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        category: "Core Grammar",
        question: "Which sentence uses Present Perfect tense correctly?",
        option_a: "She has finished the annotation batch.",
        option_b: "She finish the annotation batch yesterday.",
        option_c: "She is finished tomorrow.",
        option_d: "She was finish the work.",
        correct: "A",
        marks: 1,
        explanation: "Has + past participle denotes Present Perfect.",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "assessment_questions_template.xlsx");
  };

  const handleExcelImport = async (e, targetCatIdx = null) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      if (!rows.length) {
        toast.error("Spreadsheet is empty.");
        return;
      }

      const grouped = new Map();
      let importedCount = 0;

      rows.forEach((row) => {
        const qText = String(row.question ?? row.Question ?? "").trim();
        if (!qText) return;

        const rawOptions = [
          row.option_a ?? row.OptionA ?? row["Option A"] ?? row.A,
          row.option_b ?? row.OptionB ?? row["Option B"] ?? row.B,
          row.option_c ?? row.OptionC ?? row["Option C"] ?? row.C,
          row.option_d ?? row.OptionD ?? row["Option D"] ?? row.D,
        ]
          .filter((v) => v !== undefined && String(v).trim() !== "")
          .map((v) => String(v).trim());

        if (rawOptions.length < 2) return;

        const rawCorr = String(row.correct ?? row.Correct ?? row.answer ?? "A").trim();
        let correctIdx = 0;
        const letterIdx = { A: 0, B: 1, C: 2, D: 3 }[rawCorr.toUpperCase()];
        if (letterIdx !== undefined && letterIdx < rawOptions.length) {
          correctIdx = letterIdx;
        } else if (/^\d+$/.test(rawCorr)) {
          const num = Number(rawCorr);
          correctIdx = num >= 0 && num < rawOptions.length ? num : 0;
        } else {
          const matched = rawOptions.findIndex((o) => o.toLowerCase() === rawCorr.toLowerCase());
          correctIdx = matched >= 0 ? matched : 0;
        }

        const parsedQ = {
          question_id: uid("q"),
          question: qText,
          options: rawOptions,
          correct_index: correctIdx,
          marks: Math.max(0.5, Number(row.marks ?? row.Marks ?? 1) || 1),
          explanation: String(row.explanation ?? row.Explanation ?? "").trim(),
        };

        const catName =
          targetCatIdx !== null
            ? categories[targetCatIdx]?.name || "Imported"
            : String(row.category ?? row.Category ?? row.group ?? "Imported").trim() || "Imported";

        if (!grouped.has(catName)) grouped.set(catName, []);
        grouped.get(catName).push(parsedQ);
        importedCount += 1;
      });

      if (importedCount === 0) {
        toast.error("No valid rows found (requires question and at least option_a, option_b).");
        return;
      }

      setCategories((prev) => {
        const next = prev.map((c) => ({ ...c, questions: [...c.questions] }));
        if (targetCatIdx !== null && next[targetCatIdx]) {
          const qs = Array.from(grouped.values()).flat();
          next[targetCatIdx].questions.push(...qs);
          return next;
        }
        grouped.forEach((qs, catName) => {
          const existing = next.find((c) => c.name.toLowerCase() === catName.toLowerCase());
          if (existing) {
            existing.questions.push(...qs);
          } else {
            next.push({
              category_id: uid("cat"),
              name: catName,
              description: "",
              pick_count: Math.min(qs.length, 3),
              questions: qs,
            });
          }
        });
        return next;
      });

      toast.success(`Imported ${importedCount} ${plural(importedCount, "question")}`);
    } catch {
      toast.error("Could not parse Excel/CSV file.");
    }
  };

  const activeCategory = categories[activeCategoryIdx] || categories[0];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-end">
      <div className="fixed inset-0 bg-slate-900/35" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${test.title}`}
        className="relative w-full max-w-4xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold text-slate-900 truncate">
                Configure assessment
              </h2>
              <span
                className={
                  test.status === "published"
                    ? "px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                }
              >
                {test.status === "published" ? "Published" : "Draft"}
              </span>
              <span className={ui.tag}>{isTyping ? "Typing" : "MCQ Pool"}</span>
            </div>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {isTyping
                ? "Configure passage, target WPM benchmark, accuracy gate, and proctoring rules."
                : "Organize category pools, set draw counts per sitting, and validate questions before publishing."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close configuration drawer"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Core Metadata & Proctoring */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={ui.label}>Assessment title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={ui.input}
                  placeholder="e.g., Annotation QA Benchmark"
                />
              </div>
              <div>
                <label className={ui.label}>Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={ui.input}
                  placeholder="Optional candidate overview shown before start"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className={ui.label}>Duration (min)</label>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className={`${ui.input} tabular-nums`}
                />
              </div>
              <div>
                <label className={ui.label}>{isTyping ? "Min score % (opt)" : "Pass score %"}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  placeholder={isTyping ? "WPM/Acc" : "70"}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className={`${ui.input} tabular-nums`}
                />
              </div>
              <div>
                <label className={ui.label}>Max attempts</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  className={`${ui.input} tabular-nums`}
                />
              </div>
              <div>
                <label className={ui.label}>Max tab switches</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={maxTabSwitches}
                  onChange={(e) => setMaxTabSwitches(e.target.value)}
                  className={`${ui.input} tabular-nums`}
                  title="99 disables automatic tab-switch flagging"
                />
              </div>
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => setRequireCamera((v) => !v)}
                  className={`h-9 px-3 rounded-lg border text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    requireCamera
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {requireCamera ? "Cam required" : "Cam optional"}
                </button>
              </div>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Typing Blueprint Editor */}
          {isTyping ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-slate-500" />
                  <h3 className={ui.heading}>Typing test passage & thresholds</h3>
                </div>
                <span
                  className={`text-[12px] font-medium tabular-nums ${
                    poolStats.words >= 20 ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {poolStats.words} {plural(poolStats.words, "word")} (min 20 to publish)
                </span>
              </div>

              <div>
                <label className={ui.label}>Passage text</label>
                <textarea
                  rows={7}
                  value={passageText}
                  onChange={(e) => setPassageText(e.target.value)}
                  className={ui.textarea}
                  placeholder="Enter at least 20 words that candidates will transcribe cleanly under keystroke and paste proctoring..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={ui.label}>Target WPM</label>
                  <input
                    type="number"
                    min={1}
                    max={250}
                    value={targetWpm}
                    onChange={(e) => setTargetWpm(e.target.value)}
                    className={`${ui.input} tabular-nums`}
                  />
                  <p className={ui.hint}>Net words per minute benchmark to pass.</p>
                </div>
                <div>
                  <label className={ui.label}>Minimum accuracy %</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={minAccuracy}
                    onChange={(e) => setMinAccuracy(e.target.value)}
                    className={`${ui.input} tabular-nums`}
                  />
                  <p className={ui.hint}>Character similarity gate computed on server.</p>
                </div>
              </div>
            </section>
          ) : (
            /* MCQ Category Pooling Studio */
            <section className="space-y-4">
              {/* Summary & Pool Controls */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-[13px]">
                  <span className="text-indigo-700 font-semibold tabular-nums">
                    Candidates get {plural(poolStats.totalPick, "question")} per test
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-600 tabular-nums">
                    {plural(poolStats.totalPool, "question")} written across{" "}
                    {plural(poolStats.categoryCount, "group")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[12px] font-medium ${
                      poolStats.isReady ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {poolStats.isReady ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Pool ready to publish
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="h-3.5 w-3.5" /> {poolStats.issues[0] || "Incomplete pool"}
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShuffleQuestions((v) => !v)}
                    className={`h-8 px-2.5 rounded-md border text-[12px] font-medium flex items-center gap-1.5 transition-colors ${
                      shuffleQuestions
                        ? "bg-white border-indigo-200 text-indigo-700"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    <Shuffle className="h-3.5 w-3.5" /> Shuffle Qs
                  </button>
                  <button
                    type="button"
                    onClick={() => setShuffleOptions((v) => !v)}
                    className={`h-8 px-2.5 rounded-md border text-[12px] font-medium flex items-center gap-1.5 transition-colors ${
                      shuffleOptions
                        ? "bg-white border-indigo-200 text-indigo-700"
                        : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    <Shuffle className="h-3.5 w-3.5" /> Shuffle options
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-[12px] font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                    title="Download Excel question template"
                  >
                    <Download className="h-3.5 w-3.5" /> Template
                  </button>
                  <label className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    Import Excel
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => handleExcelImport(e, null)}
                    />
                  </label>
                </div>
              </div>

              {/* Group Tabs + Add Group */}
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat, idx) => {
                  const active = idx === activeCategoryIdx;
                  const short = cat.questions.length < Math.max(1, Number(cat.pick_count || 1));
                  return (
                    <button
                      key={cat.category_id}
                      type="button"
                      title={`${cat.questions.length} written · ${cat.pick_count} shown per test`}
                      onClick={() => setActiveCategoryIdx(idx)}
                      className={`h-9 px-3 rounded-lg border text-[13px] font-medium flex items-center gap-2 transition-colors ${
                        active
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate max-w-[140px]">{cat.name || `Group ${idx + 1}`}</span>
                      <span
                        className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
                          active
                            ? "bg-indigo-500/70 text-white"
                            : short
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {cat.pick_count} of {cat.questions.length}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={addCategory}
                  className="h-9 px-3 rounded-lg border border-dashed border-slate-300 text-[13px] font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/40 flex items-center gap-1.5 transition-colors"
                >
                  <FolderPlus className="h-4 w-4" /> Add MCQ group
                </button>
              </div>

              {/* Active Group Settings & Questions */}
              {activeCategory && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className={ui.label}>Group name</label>
                      <input
                        type="text"
                        value={activeCategory.name}
                        onChange={(e) => updateCategoryField(activeCategoryIdx, "name", e.target.value)}
                        className={ui.input}
                        placeholder="e.g., Tenses & Grammar"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className={ui.label}>Topic description (optional)</label>
                      <input
                        type="text"
                        value={activeCategory.description}
                        onChange={(e) => updateCategoryField(activeCategoryIdx, "description", e.target.value)}
                        className={ui.input}
                        placeholder="Shown in category breakdown"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={ui.label}>Shown per test</label>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={activeCategory.pick_count}
                        onChange={(e) => updateCategoryField(activeCategoryIdx, "pick_count", e.target.value)}
                        className={`${ui.input} tabular-nums`}
                      />
                      <p className={`${ui.hint} tabular-nums`}>
                        of {plural(activeCategory.questions.length, "question")} in this group
                      </p>
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeCategory(activeCategoryIdx)}
                        className="h-9 w-9 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-colors"
                        title="Remove group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {activeCategory.questions.length < Math.max(1, Number(activeCategory.pick_count || 1)) && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>
                        Pool has {activeCategory.questions.length}{" "}
                        {plural(activeCategory.questions.length, "question")}, but draw count is{" "}
                        {activeCategory.pick_count}. Add more questions or reduce draw count before publishing.
                      </span>
                    </div>
                  )}

                  {/* Questions inside active group */}
                  <div className="space-y-3">
                    {activeCategory.questions.map((q, qIdx) => (
                      <div key={q.question_id} className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="h-6 px-2 rounded bg-slate-200/70 text-[12px] font-semibold text-slate-700 inline-flex items-center tabular-nums">
                              Q{qIdx + 1}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">{q.question_id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-[12px] text-slate-500 flex items-center gap-1.5">
                              Marks
                              <input
                                type="number"
                                min={0.5}
                                step={0.5}
                                value={q.marks}
                                onChange={(e) => updateQuestionField(activeCategoryIdx, qIdx, "marks", e.target.value)}
                                className="w-16 h-7 px-2 rounded border border-slate-200 bg-white text-[12px] text-slate-900 tabular-nums"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => removeQuestion(activeCategoryIdx, qIdx)}
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete question"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => updateQuestionField(activeCategoryIdx, qIdx, "question", e.target.value)}
                          className={ui.input}
                          placeholder="Enter the question prompt..."
                        />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium text-slate-500">
                              Options (select radio for the correct answer)
                            </span>
                            {q.options.length < 6 && (
                              <button
                                type="button"
                                onClick={() => addOption(activeCategoryIdx, qIdx)}
                                className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
                              >
                                + Add option
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correct_index === optIdx;
                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 bg-white ${
                                    isCorrect ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct_${q.question_id}`}
                                    checked={isCorrect}
                                    onChange={() =>
                                      updateQuestionField(activeCategoryIdx, qIdx, "correct_index", optIdx)
                                    }
                                    className="text-emerald-600 focus:ring-emerald-500"
                                    aria-label={`Mark option ${String.fromCharCode(65 + optIdx)} as correct`}
                                  />
                                  <span className="text-[11px] font-semibold text-slate-400 w-4">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => updateOption(activeCategoryIdx, qIdx, optIdx, e.target.value)}
                                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                    className="flex-1 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                                  />
                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removeOption(activeCategoryIdx, qIdx, optIdx)}
                                      className="text-slate-300 hover:text-red-500"
                                      title="Remove option"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={q.explanation}
                            onChange={(e) => updateQuestionField(activeCategoryIdx, qIdx, "explanation", e.target.value)}
                            className="flex-1 h-8 px-2.5 rounded border border-slate-200 bg-white text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                            placeholder="Optional answer explanation (evaluator scorecard only — never leaked to candidates)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addQuestionToCategory(activeCategoryIdx)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add question to {activeCategory.name || "group"}
                    </Button>
                    <label className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      Import into this group
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => handleExcelImport(e, activeCategoryIdx)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-[12px] text-slate-500">
            Updates save as versioned snapshots; live attempts continue on their frozen questions.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="cancel" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave("draft")}
              disabled={updateMutation.isPending}
            >
              {test.status === "published" ? "Revert to draft" : "Save draft"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={updateMutation.isPending}
              loadingText="Saving..."
              onClick={() => handleSave("published")}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {test.status === "published" ? "Save published changes" : "Save & publish"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
