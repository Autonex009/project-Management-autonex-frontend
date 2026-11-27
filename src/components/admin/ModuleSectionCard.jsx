import React, { useState } from "react";
import {
  GripVertical,
  Trash2,
  Video,
  FileText,
  CheckCircle2,
  Circle,
  Plus,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { onboardingApi } from "../../services/api";
import Dropdown from "../ui/Dropdown";
import { clampPassingScore } from "../../utils/onboarding";
import {
  FIELD,
  TEXTAREA,
  LABEL,
  GHOST_BTN,
  DELETE_ICON_BTN,
  Required,
} from "./moduleFormStyles";

export default function ModuleSectionCard({
  index,
  section,
  onChange,
  onRemove,
}) {
  const [showDocForm, setShowDocForm] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("PDF");
  const [docUrl, setDocUrl] = useState("");
  const docTypeOptions = [
    { value: "PDF", label: "PDF" },
    { value: "DOCX", label: "DOCX" },
    { value: "PPT", label: "PPT" },
    { value: "XLS", label: "XLS" },
    { value: "Link", label: "Link" },
  ];

  const updateField = (field, value) => {
    onChange({ ...section, [field]: value });
  };

  const hasVideo = Boolean(section.videoUrl && section.videoUrl.trim());
  const hasQuestions =
    Array.isArray(section.questions) && section.questions.length > 0;

  const addQuestion = () => {
    onChange({
      ...section,
      questions: [
        ...section.questions,
        {
          id: Math.random().toString(36).substring(7),
          question: "",
          options: ["", "", "", ""],
          correctIndex: 0,
        },
      ],
    });
  };

  const updateQuestion = (qId, field, value) => {
    onChange({
      ...section,
      questions: section.questions.map((q) =>
        q.id === qId ? { ...q, [field]: value } : q,
      ),
    });
  };

  const updateOption = (qId, optIndex, value) => {
    onChange({
      ...section,
      questions: section.questions.map((q) => {
        if (q.id === qId) {
          const newOpts = [...q.options];
          newOpts[optIndex] = value;
          return { ...q, options: newOpts };
        }
        return q;
      }),
    });
  };

  const removeQuestion = (qId) => {
    const remaining = section.questions.filter((q) => q.id !== qId);
    onChange({
      ...section,
      questions: remaining,
      ...(remaining.length === 0 ? { quizPassingScore: 0 } : {}),
    });
  };

  const handleAddDocument = () => {
    if (!docTitle.trim() || !docUrl.trim()) return;
    updateField("document", { title: docTitle, type: docType, url: docUrl });
    setShowDocForm(false);
    setDocTitle("");
    setDocType("PDF");
    setDocUrl("");
  };

  const handleQuizFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Parse locally using xlsx
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const newQuestions = rows
        .map((row) => {
          const options = [
            row.option1?.toString() || "",
            row.option2?.toString() || "",
            row.option3?.toString() || "",
            row.option4?.toString() || "",
          ];
          // Excel uses 1-based correctOption. Guard against NaN / out-of-range.
          const raw = parseInt(String(row.correctOption ?? "1").trim(), 10);
          const oneBased = Number.isFinite(raw) ? raw : 1;
          const correctIndex = Math.max(
            0,
            Math.min(options.length - 1, oneBased - 1),
          );

          return {
            id: Math.random().toString(36).substring(7),
            question: row.question?.toString() || "",
            options,
            correctIndex,
          };
        })
        .filter((q) => q.question.trim());

      onChange({
        ...section,
        questions: [...section.questions, ...newQuestions],
      });
    } catch (err) {
      console.error("Failed to import quiz from Excel:", err);
      toast.error("Couldn't read that file. Check it matches the template");
    }
    e.target.value = "";
  };

  const questionCount = section.questions.length;
  const fieldId = (name) => `section-${section.id}-${name}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      {/* Header — number, title, delete */}
      <div className="flex items-center gap-3 border-b border-slate-100 py-3 pl-3 pr-3">
        <GripVertical
          className="h-4 w-4 shrink-0 cursor-move text-slate-300"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="w-6 shrink-0 text-[13px] tabular-nums text-slate-400">
          {String(index + 1).padStart(2, "0")}
        </span>
        <input
          type="text"
          value={section.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Section title"
          aria-label={`Section ${index + 1} title`}
          aria-required="true"
          className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-400 transition-colors hover:border-slate-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
        />
        <button
          type="button"
          onClick={onRemove}
          className={DELETE_ICON_BTN}
          title="Delete section"
          aria-label={`Delete section ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {/* Content */}
        <div className="space-y-5 px-6 py-5">
          <div>
            <label htmlFor={fieldId("description")} className={LABEL}>
              <span>
                Description
                <Required />
              </span>
            </label>
            <textarea
              id={fieldId("description")}
              value={section.description}
              onChange={(e) => updateField("description", e.target.value)}
              className={TEXTAREA}
              rows={2}
              placeholder="What candidates will learn in this section"
              aria-required="true"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
            <div>
              <label htmlFor={fieldId("video")} className={LABEL}>
                <span>Video</span>
                <span className="text-xs font-normal text-slate-400">Google Drive link</span>
              </label>
              <div className="relative">
                <Video
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.5}
                />
                <input
                  id={fieldId("video")}
                  type="text"
                  value={section.videoUrl}
                  onChange={(e) =>
                    onChange({
                      ...section,
                      videoUrl: e.target.value,
                      ...(e.target.value.trim() ? {} : { videoDuration: "" }),
                    })
                  }
                  className={`${FIELD} pl-9`}
                  placeholder="https://drive.google.com/file/d/…"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor={fieldId("duration")}
                className={`${LABEL} ${hasVideo ? "" : "text-slate-400"}`}
              >
                <span>Duration</span>
              </label>
              <input
                id={fieldId("duration")}
                type="text"
                value={section.videoDuration}
                onChange={(e) => updateField("videoDuration", e.target.value)}
                disabled={!hasVideo}
                title={hasVideo ? "" : "Add a video link first"}
                className={FIELD}
                placeholder="15 min"
              />
            </div>
          </div>

          {/* Document */}
          <div>
            <p className={LABEL}>
              <span>Document</span>
              {!section.document && !showDocForm && (
                <span className="text-xs font-normal text-slate-400">Optional</span>
              )}
            </p>

            {section.document ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[13px] font-medium text-slate-900">
                      {section.document.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{section.document.type}</span>
                  </div>
                  <a
                    href={section.document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-slate-500 hover:text-indigo-600 hover:underline"
                  >
                    {section.document.url}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => updateField("document", undefined)}
                  className={DELETE_ICON_BTN}
                  title="Remove document"
                  aria-label="Remove document"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            ) : showDocForm ? (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Title, e.g. Employee handbook"
                    aria-label="Document title"
                    className={FIELD}
                  />
                  <input
                    type="url"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="https://"
                    aria-label="Document link"
                    className={FIELD}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32">
                    <Dropdown
                      options={docTypeOptions}
                      value={docType}
                      onChange={(value) => setDocType(value)}
                    />
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowDocForm(false)}
                      className={GHOST_BTN}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDocument}
                      disabled={!docTitle.trim() || !docUrl.trim()}
                      className="inline-flex h-8 items-center rounded-lg bg-slate-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Attach
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDocForm(true)}
                className={`${GHOST_BTN} -ml-2.5`}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                Attach document
              </button>
            )}
          </div>
        </div>

        {/* Quiz */}
        <div className="px-6 py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h4 className="text-sm font-medium text-slate-900">Quiz</h4>
              <span className="text-xs tabular-nums text-slate-400">
                {questionCount === 0
                  ? "Optional"
                  : `${questionCount} ${questionCount === 1 ? "question" : "questions"}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <label className={`${GHOST_BTN} cursor-pointer`}>
                <Upload className="h-4 w-4" strokeWidth={1.5} />
                Import from Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleQuizFileImport}
                  className="hidden"
                />
              </label>
              <a
                href={onboardingApi.getQuizSampleUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-2 text-[13px] text-slate-500 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-900"
              >
                Template
              </a>
            </div>
          </div>

          {hasQuestions && (
            <div className="mb-4 flex items-center gap-3">
              <label htmlFor={fieldId("pass")} className="text-[13px] font-medium text-slate-700">
                Pass mark
              </label>
              <div className="relative w-24">
                <input
                  id={fieldId("pass")}
                  type="number"
                  min={0}
                  max={100}
                  value={section.quizPassingScore || 0}
                  onChange={(e) =>
                    updateField("quizPassingScore", clampPassingScore(e.target.value))
                  }
                  className={`${FIELD} pr-7 tabular-nums`}
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
              <span className="text-xs text-slate-500">0 means no minimum</span>
            </div>
          )}

          <div className="space-y-3">
            {section.questions.map((q, qIdx) => (
              <div key={q.id || qIdx} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="w-6 shrink-0 text-[13px] tabular-nums text-slate-400">
                    Q{qIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                    className={`${FIELD} font-medium`}
                    placeholder="Question"
                    aria-label={`Question ${qIdx + 1}`}
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className={DELETE_ICON_BTN}
                    title="Delete question"
                    aria-label={`Delete question ${qIdx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>

                <div
                  className="grid grid-cols-1 gap-2 pl-9 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label={`Correct answer for question ${qIdx + 1}`}
                >
                  {q.options.map((opt, optIdx) => {
                    const correct = q.correctIndex === optIdx;
                    return (
                      <div key={optIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={correct}
                          onClick={() => updateQuestion(q.id, "correctIndex", optIdx)}
                          title={correct ? "Correct answer" : "Mark as correct"}
                          className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                        >
                          {correct ? (
                            <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600" strokeWidth={1.5} />
                          ) : (
                            <Circle
                              className="h-[18px] w-[18px] text-slate-300 transition-colors hover:text-slate-500"
                              strokeWidth={1.5}
                            />
                          )}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                          className={`${FIELD} ${correct ? "border-emerald-300 hover:border-emerald-400" : ""}`}
                          placeholder={`Option ${optIdx + 1}`}
                          aria-label={`Question ${qIdx + 1}, option ${optIdx + 1}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className={`${GHOST_BTN} -ml-2.5 ${hasQuestions ? "mt-3" : ""}`}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add question
          </button>
        </div>
      </div>
    </section>
  );
}
