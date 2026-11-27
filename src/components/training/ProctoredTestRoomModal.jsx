import { createPortal } from "react-dom";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock,
  Keyboard,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Button from "../ui/Button";
import ConfirmDialog from "../ui/ConfirmDialog";
import ExamRoom, { formatClock, groupIntoSections } from "./ExamRoom";
import { PreviewCameraMonitor } from "./CameraMonitorCard";
import { plural, ui } from "./trainingStyles";

/**
 * "Preview as candidate".
 *
 * Walks through exactly what a candidate goes through, in the same three steps:
 *   1. instructions  2. the exam room (the shared <ExamRoom/>)  3. the result
 * filled from the saved blueprint with a fresh random draw. Never persists attempts and never
 * records video.
 */

const shuffled = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Builds a paper the way the server does when a candidate starts: draw `pick_count` questions at
 * random from every group, shuffle questions and options (when enabled) and remap the correct
 * answer to its new position.
 */
function drawPreviewPaper(test) {
  const cfg = test?.test_config || {};
  const cats = Array.isArray(cfg.categories) ? cfg.categories : [];
  const shuffleOptions = cfg.shuffle_options !== false;
  const shuffleQuestions = cfg.shuffle_questions !== false;

  const paper = [];
  cats.forEach((cat) => {
    const pool = Array.isArray(cat.questions) ? cat.questions : [];
    const pick = Math.min(pool.length, Math.max(1, Number(cat.pick_count || pool.length)));
    shuffled(pool)
      .slice(0, pick)
      .forEach((q) => {
        const options = Array.isArray(q.options) ? q.options : [];
        const identity = options.map((_, i) => i);
        const order = shuffleOptions ? shuffled(identity) : identity;
        paper.push({
          question_id: q.question_id,
          question: q.question,
          marks: Number(q.marks || 1),
          category_name: cat.name || "Questions",
          options: order.map((i) => options[i]),
          correct_index: order.indexOf(Number(q.correct_index || 0)),
        });
      });
  });
  return shuffleQuestions ? shuffled(paper) : paper;
}

function scorePaper(paper, answers, passingScore) {
  let earned = 0;
  let total = 0;
  let correct = 0;
  const bySection = new Map();
  paper.forEach((q) => {
    const marks = Number(q.marks || 1);
    const isRight = answers[q.question_id] === q.correct_index;
    total += marks;
    if (isRight) {
      earned += marks;
      correct += 1;
    }
    const s = bySection.get(q.category_name) || { name: q.category_name, correct: 0, count: 0 };
    s.count += 1;
    if (isRight) s.correct += 1;
    bySection.set(q.category_name, s);
  });
  const pct = total > 0 ? Math.round((earned / total) * 1000) / 10 : 0;
  const hasPassMark = passingScore !== null && passingScore !== undefined && passingScore !== "";
  return {
    earned,
    total,
    correct,
    count: paper.length,
    pct,
    pass: hasPassMark ? pct >= Number(passingScore) : null,
    sections: [...bySection.values()],
  };
}

/** Light page chrome shared by the instruction, typing and result screens. */
function Screen({ title, subtitle, onClose, children, width = "max-w-2xl" }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <header className="bg-white border-b border-slate-200 h-14 px-6 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <span className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-slate-700" strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-slate-900 truncate">{title}</h1>
            <div className="text-xs text-slate-500">{subtitle}</div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg shadow-none text-xs" onClick={onClose}>
          Exit preview
        </Button>
      </header>
      <main className={`flex-1 w-full ${width} mx-auto p-6`}>{children}</main>
    </div>
  );
}

function Intro({ test, paperSize, isTyping, requireCamera, maxTabs, onStart, onClose }) {
  const tiles = [
    { label: "Duration", value: `${test?.duration_minutes || 20} mins` },
    isTyping
      ? { label: "Target", value: `${test?.test_config?.target_wpm || 40} WPM` }
      : { label: "Questions", value: String(paperSize) },
    {
      label: "Pass mark",
      value:
        test?.passing_score !== null && test?.passing_score !== undefined && test?.passing_score !== ""
          ? `${test.passing_score}%`
          : "Not set",
    },
    { label: "Tab limit", value: !maxTabs || maxTabs >= 99 ? "Monitored" : `Max ${maxTabs}` },
  ];
  const empty = !isTyping && paperSize === 0;

  return (
    <Screen title={test?.title} subtitle="Author preview · nothing is saved" onClose={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <span className="text-xs font-medium text-indigo-600">Proctored assessment</span>
          <h2 className="text-lg font-medium text-slate-900 mt-0.5">{test?.title}</h2>
          {test?.description && (
            <p className="text-sm text-slate-600 leading-relaxed mt-2">{test.description}</p>
          )}
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-slate-500">{t.label}</div>
                <div className="text-sm font-medium text-slate-900 mt-0.5">{t.value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-900">Before you begin</div>
            <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
              <li>Keep this tab active. Tab switches and focus losses are recorded for candidates.</li>
              {requireCamera && (
                <li>
                  <span className="inline-flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
                    Candidates must enable their webcam before they can start. The camera is off in this preview.
                  </span>
                </li>
              )}
              {isTyping ? (
                <li>Pasting is blocked. Type the passage exactly as shown.</li>
              ) : (
                <li>Use the question palette to move around, and mark any question for review.</li>
              )}
              <li>Nothing from this preview is saved or scored against anyone.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-rose-600">
              {empty ? "No questions yet. Open Configure and add questions to a group first." : ""}
            </p>
            <Button variant="primary" disabled={empty} onClick={onStart}>
              <Play className="h-4 w-4 mr-1.5" strokeWidth={1.75} />
              Start preview
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  );
}

function Result({ test, result, onRetry, onClose }) {
  const isMcq = result.type === "mcq";
  const failed = result.pass === false;
  return (
    <Screen title={test?.title} subtitle="Author preview · nothing is saved" onClose={onClose} width="max-w-xl">
      <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-6">
        <div className="text-center space-y-2">
          {failed ? (
            <XCircle className="h-9 w-9 text-rose-500 mx-auto" strokeWidth={1.5} />
          ) : (
            <CheckCircle2 className="h-9 w-9 text-emerald-600 mx-auto" strokeWidth={1.5} />
          )}
          {isMcq ? (
            <>
              <div className="text-4xl font-medium text-slate-900 tabular-nums">{result.pct}%</div>
              <div className="text-sm text-slate-600 tabular-nums">
                {result.correct} / {result.count} correct
                {result.pass !== null && (
                  <>
                    {" · "}
                    <span className={result.pass ? "text-emerald-700 font-medium" : "text-rose-600 font-medium"}>
                      {result.pass ? "Passed" : "Not passed"}
                    </span>
                    {` (pass mark ${test.passing_score}%)`}
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl font-medium text-slate-900 tabular-nums">{result.wpm} WPM</div>
              <div className="text-sm text-slate-600 tabular-nums">
                {result.accuracy}% accuracy
                {result.pass !== null && (
                  <>
                    {" · "}
                    <span className={result.pass ? "text-emerald-700 font-medium" : "text-rose-600 font-medium"}>
                      {result.pass ? "Passed" : "Not passed"}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
          <div className="text-xs text-slate-500 tabular-nums">Time taken {formatClock(result.spent)}</div>
        </div>

        {isMcq && result.sections.length > 1 && (
          <ul className="divide-y divide-slate-100 border-y border-slate-100">
            {result.sections.map((s) => (
              <li key={s.name} className="py-3 flex items-center justify-between text-sm">
                <span className="text-slate-700">{s.name}</span>
                <span className="tabular-nums text-slate-900">
                  {s.correct} / {s.count}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-slate-500 text-center">
          Candidates see this summary after they submit. They never see which answers were right.
        </p>

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="h-4 w-4 mr-1.5" strokeWidth={1.75} />
            {isMcq ? "Try a new draw" : "Try again"}
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Exit preview
          </Button>
        </div>
      </div>
    </Screen>
  );
}

function TypingRoom({ test, secondsLeft, banner = "", bannerTone = "warn", onFinish, onClose }) {
  const [typedText, setTypedText] = useState("");
  const [pasteNotice, setPasteNotice] = useState(false);
  const urgent = secondsLeft <= 120;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <header className="bg-white border-b border-slate-200 h-14 px-6 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <span className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-slate-700" strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-slate-900 truncate">{test?.title}</h1>
            <div className="text-xs text-slate-500">Author preview · nothing is saved</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2.5 px-3 py-1 rounded-lg border ${
              urgent
                ? "bg-rose-50 border-rose-200 text-rose-700"
                : "bg-slate-50 border-slate-200/80 text-slate-900"
            }`}
            aria-label="Time left"
          >
            <Clock className={`h-4 w-4 ${urgent ? "text-rose-600" : "text-slate-400"}`} strokeWidth={1.5} />
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">Time left</span>
              <span className={`font-mono text-sm font-medium tabular-nums ${urgent ? "text-rose-700" : "text-slate-900"}`}>
                {formatClock(secondsLeft)}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg shadow-none text-xs" onClick={onClose}>
            Exit preview
          </Button>
        </div>
      </header>

      {banner ? (
        <div
          className={`px-6 py-2 text-xs font-medium flex items-center justify-center gap-2 border-b ${
            bannerTone === "danger"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <ShieldAlert
            className={`h-4 w-4 ${bannerTone === "danger" ? "text-rose-600" : "text-amber-600"}`}
            strokeWidth={1.5}
          />
          {banner}
        </div>
      ) : null}

      <main className="flex-1 w-full max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 font-medium text-slate-900">
              <Keyboard className="h-4 w-4 text-teal-600" strokeWidth={1.75} /> Typing assessment passage
            </span>
            <span className="text-xs text-slate-500 tabular-nums">
              Target {test?.test_config?.target_wpm || 40} WPM · {test?.test_config?.min_accuracy_percent || 90}% accuracy
            </span>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-[15px] leading-relaxed text-slate-800 font-mono select-none">
            {test?.test_config?.passage_text}
          </div>
          {pasteNotice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" strokeWidth={1.75} /> Paste is blocked during typing assessments
            </div>
          )}
          <textarea
            rows={8}
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              setPasteNotice(true);
            }}
            placeholder="Begin typing the passage above"
            className={`${ui.textarea} font-mono`}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 tabular-nums">{typedText.length} characters</span>
            <Button variant="primary" size="sm" onClick={() => onFinish(typedText)}>
              Submit test
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function PreviewFlow({ test, onClose }) {
  const isTyping = test?.test_type === "typing";
  const requireCamera = Boolean(test?.proctoring_config?.require_camera);
  const maxTabs = Number(test?.proctoring_config?.max_tab_switches || 0);
  const duration = Number(test?.duration_minutes || 20) * 60;

  const [stage, setStage] = useState("intro"); // intro | exam | result
  const [paper, setPaper] = useState(() => (isTyping ? [] : drawPreviewPaper(test)));
  const [answers, setAnswers] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [proctorBanner, setProctorBanner] = useState("");
  const startedAt = useRef(Date.now());
  const cameraPromptActiveRef = useRef(false);
  const cameraPromptCooldownUntilRef = useRef(0);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const handleCameraPermissionPendingChange = useCallback((pending) => {
    cameraPromptActiveRef.current = Boolean(pending);
    if (!pending) {
      // Allow browser focus bounce after user clicks Allow/Block without triggering blur/tab warnings
      cameraPromptCooldownUntilRef.current = Date.now() + 800;
    }
  }, []);

  const isCameraPromptGrace = useCallback(
    () => cameraPromptActiveRef.current || Date.now() < cameraPromptCooldownUntilRef.current,
    []
  );

  const finishMcq = useCallback(() => {
    setConfirmOpen(false);
    setResult({
      type: "mcq",
      spent: Math.round((Date.now() - startedAt.current) / 1000),
      ...scorePaper(paper, answersRef.current, test?.passing_score),
    });
    setStage("result");
  }, [paper, test?.passing_score]);

  const finishTyping = useCallback(
    (typedText) => {
      const target = String(test?.test_config?.passage_text || "");
      const spent = Math.round((Date.now() - startedAt.current) / 1000);
      const mins = Math.max(0.1, spent / 60);
      const words = typedText.trim() ? typedText.trim().split(/\s+/).length : 0;
      const minLen = Math.min(target.length, typedText.length);
      let matches = 0;
      for (let i = 0; i < minLen; i += 1) if (target[i] === typedText[i]) matches += 1;
      const accuracy =
        target.length > 0 ? Math.round((matches / Math.max(target.length, typedText.length, 1)) * 100) : 0;
      const wpm = Math.round(words / mins);
      const targetWpm = Number(test?.test_config?.target_wpm || 0);
      const minAcc = Number(test?.test_config?.min_accuracy_percent || 0);
      setResult({ type: "typing", wpm, accuracy, spent, pass: wpm >= targetWpm && accuracy >= minAcc });
      setStage("result");
    },
    [test]
  );

  // Clock runs only while the exam room is open
  useEffect(() => {
    if (stage !== "exam") return undefined;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage === "exam" && secondsLeft === 0) {
      if (isTyping) finishTyping("");
      else finishMcq();
    }
  }, [stage, secondsLeft, isTyping, finishMcq, finishTyping]);

  // Simulate candidate tab-switch & focus-loss detection during exam preview (ignoring camera permission dialog)
  useEffect(() => {
    if (stage !== "exam") return undefined;
    const limitConfigured = maxTabs > 0 && maxTabs < 99;

    const onVisibility = () => {
      if (!document.hidden || isCameraPromptGrace()) return;
      setTabSwitches((prev) => {
        const next = prev + 1;
        setProctorBanner(
          limitConfigured && next > maxTabs
            ? `Tab switch detected (${next} / ${maxTabs} max) — candidate attempt would be flagged.`
            : `Tab switch detected (${next}${limitConfigured ? ` / ${maxTabs} max` : ""}) — candidates' sittings record this.`
        );
        return next;
      });
    };

    const onBlur = () => {
      if (document.hidden || isCameraPromptGrace()) return;
      setProctorBanner((prev) => prev || "Window focus lost — recorded as focus loss for candidates.");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [stage, maxTabs, isCameraPromptGrace]);

  const start = () => {
    startedAt.current = Date.now();
    setTabSwitches(0);
    setProctorBanner("");
    setSecondsLeft(duration);
    setStage("exam");
  };

  const retry = () => {
    setPaper(isTyping ? [] : drawPreviewPaper(test));
    setAnswers({});
    setActiveIndex(0);
    setResult(null);
    setTabSwitches(0);
    setProctorBanner("");
    setSecondsLeft(duration);
    setStage("intro");
  };

  // Sections appear in the order the author built the groups, not in shuffled draw order
  const blueprintSectionOrder = useMemo(
    () =>
      (Array.isArray(test?.test_config?.categories) ? test.test_config.categories : []).map(
        (c) => c.name || "Questions"
      ),
    [test]
  );
  const sections = useMemo(
    () => groupIntoSections(paper, blueprintSectionOrder).sections,
    [paper, blueprintSectionOrder]
  );

  if (stage === "intro") {
    return (
      <Intro
        test={test}
        paperSize={paper.length}
        isTyping={isTyping}
        requireCamera={requireCamera}
        maxTabs={maxTabs}
        onStart={start}
        onClose={onClose}
      />
    );
  }

  if (stage === "result" && result) {
    return <Result test={test} result={result} onRetry={retry} onClose={onClose} />;
  }

  const limitExceeded = maxTabs > 0 && maxTabs < 99 && tabSwitches > maxTabs;
  const bannerTone = limitExceeded ? "danger" : "warn";

  if (isTyping) {
    return (
      <TypingRoom
        test={test}
        secondsLeft={secondsLeft}
        banner={proctorBanner}
        bannerTone={bannerTone}
        onFinish={finishTyping}
        onClose={onClose}
      />
    );
  }

  const previewChips = [
    ...(requireCamera ? [{ icon: Camera, label: "Camera required for candidates" }] : []),
    ...(tabSwitches > 0
      ? [
          {
            icon: ShieldAlert,
            label:
              maxTabs > 0 && maxTabs < 99
                ? `Tab switches: ${tabSwitches}/${maxTabs}`
                : `Tab switches: ${tabSwitches}`,
            tone: limitExceeded ? "danger" : "warn",
          },
        ]
      : []),
  ];

  return (
    <>
      <ExamRoom
        title={test?.title}
        previewBanner="Preview mode · nothing is saved. Candidates see this exact screen."
        eyebrow={`${plural(paper.length, "question")} in ${plural(sections.length, "section")}`}
        chips={previewChips}
        questions={paper}
        sectionOrder={blueprintSectionOrder}
        answers={answers}
        onSelect={(qid, idx) => setAnswers((prev) => ({ ...prev, [qid]: idx }))}
        onClear={(qid) =>
          setAnswers((prev) => {
            const { [qid]: _removed, ...rest } = prev;
            return rest;
          })
        }
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        secondsLeft={secondsLeft}
        onSubmit={() => setConfirmOpen(true)}
        submitLabel="Submit test"
        banner={proctorBanner}
        bannerTone={bannerTone}
        onExit={onClose}
        rail={
          requireCamera ? (
            <PreviewCameraMonitor onPermissionPendingChange={handleCameraPermissionPendingChange} />
          ) : null
        }
      />
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={finishMcq}
        variant="info"
        title="Submit the preview?"
        message="This only scores your sample draw. Nothing is saved and no attempt is recorded."
        confirmText="Submit preview"
      />
    </>
  );
}

export default function ProctoredTestRoomModal({ test, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-50" role="dialog" aria-modal="true">
      <PreviewFlow test={test} onClose={onClose} />
    </div>,
    document.body
  );
}
