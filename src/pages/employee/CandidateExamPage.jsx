import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  Keyboard,
  Play,
  ShieldAlert,
  ShieldCheck,
  Video,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { assessmentApi } from "../../services/api";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ExamRoom from "../../components/training/ExamRoom";
import CameraMonitorCard from "../../components/training/CameraMonitorCard";

function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function CandidateExamPage() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submittedResult, setSubmittedResult] = useState(null);
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [proctorWarning, setProctorWarning] = useState("");
  const [tabSwitches, setTabSwitches] = useState(0);

  // Webcam & MediaRecorder Refs
  const [cameraVerified, setCameraVerified] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoPreviewRef = useRef(null);
  const liveVideoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const cameraPromptActiveRef = useRef(false);
  const cameraPromptCooldownUntilRef = useRef(0);

  const isCameraPromptGrace = useCallback(
    () => cameraPromptActiveRef.current || Date.now() < cameraPromptCooldownUntilRef.current,
    []
  );

  // Monotonic Autosave & Telemetry Refs
  const seqRef = useRef(0);
  const pendingEventsRef = useRef([]);
  const keystrokeCountRef = useRef(0);
  const answersRef = useRef({});
  const autoSubmittedRef = useRef(false);

  const numericId = Number(enrollmentId);

  const {
    data: scorecard,
    isLoading: scorecardLoading,
    error: scorecardError,
  } = useQuery({
    queryKey: ["scorecard", numericId],
    queryFn: () => assessmentApi.getScorecard(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
    retry: false,
  });

  const { data: overview } = useQuery({
    queryKey: ["assessmentOverview", scorecard?.assessment_id],
    queryFn: () => assessmentApi.getOverview(scorecard.assessment_id),
    enabled: Boolean(scorecard?.assessment_id),
  });

  const requireCamera = Boolean(overview?.proctoring_config?.require_camera ?? false);
  const maxTabSwitches = Number(overview?.proctoring_config?.max_tab_switches ?? 3);

  const stopCameraAndRecorder = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    } catch {
      // ignore stop errors
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCameraAndRecorder(), [stopCameraAndRecorder]);

  // Attach preview stream whenever cameraVerified or view transitions
  useEffect(() => {
    if (videoPreviewRef.current && streamRef.current) {
      videoPreviewRef.current.srcObject = streamRef.current;
    }
    if (liveVideoRef.current && streamRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
    }
  }, [cameraVerified, attempt]);

  const requestWebcam = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Browser does not support webcam capture in this context.");
      return false;
    }
    cameraPromptActiveRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 10, max: 15 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setCameraVerified(true);
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          pendingEventsRef.current.push({ event_type: "camera_lost", details: { reason: "track_ended" } });
          setProctorWarning("Webcam feed interrupted and logged.");
        };
      });
      return true;
    } catch {
      setCameraError("Camera access was denied or no webcam was detected.");
      setCameraVerified(false);
      return false;
    } finally {
      cameraPromptActiveRef.current = false;
      cameraPromptCooldownUntilRef.current = Date.now() + 800;
    }
  };

  const startRecordingIfAvailable = () => {
    if (!streamRef.current || typeof MediaRecorder === "undefined") return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm";
    try {
      const rec = new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 200000 });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(5000);
      recorderRef.current = rec;
    } catch {
      // Proceed even if MediaRecorder codec fails
    }
  };

  const flushAutosave = useCallback(
    async (explicitAnswers = null) => {
      if (!attempt?.id || submittedResult) return;
      seqRef.current += 1;
      const eventsBatch = pendingEventsRef.current.splice(0, 50);
      const ans = explicitAnswers ?? answersRef.current;
      try {
        await assessmentApi.autosaveDraft(attempt.id, {
          answers: ans,
          answers_seq: seqRef.current,
          events: eventsBatch.length > 0 ? eventsBatch : undefined,
        });
      } catch {
        // Re-queue unsent proctoring events on transient failure
        if (eventsBatch.length > 0) {
          pendingEventsRef.current.unshift(...eventsBatch);
        }
      }
    },
    [attempt?.id, submittedResult]
  );

  // Stop MediaRecorder cleanly and return a WebM Blob
  const captureFinalVideoBlob = () =>
    new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") {
        resolve(chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: "video/webm" }) : null);
        return;
      }
      rec.onstop = () => {
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: "video/webm" }) : null;
        resolve(blob);
      };
      try {
        rec.stop();
      } catch {
        resolve(null);
      }
    });

  const handleSubmitAttempt = useCallback(
    async (isAuto = false) => {
      if (!attempt?.id || submitting || submittedResult) return;
      setSubmitting(true);
      setConfirmSubmitOpen(false);
      setUploadStatusText("Finalizing responses...");

      try {
        let videoWarning = "";
        const videoBlob = await captureFinalVideoBlob();
        const eventsBatch = pendingEventsRef.current.splice(0, 50);
        const result = await assessmentApi.submitAttempt(attempt.id, {
          answers: answersRef.current,
          events: eventsBatch.length > 0 ? eventsBatch : undefined,
        });

        if (videoBlob && videoBlob.size > 0) {
          setUploadStatusText("Uploading proctoring video...");
          const controller = new AbortController();
          const uploadTimeout = setTimeout(() => controller.abort(), 60000);
          try {
            const { upload_url } = await assessmentApi.getRecordingUploadUrl(attempt.id);
            const isRelative = upload_url.startsWith("/");
            const putResp = await fetch(upload_url, {
              method: "PUT",
              headers: { "Content-Type": "video/webm" },
              credentials: isRelative ? "include" : "omit",
              body: videoBlob,
              signal: controller.signal,
            });
            if (putResp.ok) {
              await assessmentApi.finalizeRecording(attempt.id);
            } else {
              videoWarning = `The video upload was rejected (${putResp.status}).`;
              console.error("Proctoring upload rejected:", putResp.status);
            }
          } catch (vidErr) {
            videoWarning =
              vidErr?.name === "AbortError"
                ? "The video upload timed out due to a slow connection."
                : vidErr?.response?.data?.detail || "The video could not be uploaded.";
            console.error("Proctoring upload failed:", vidErr);
          } finally {
            clearTimeout(uploadTimeout);
          }
        }

        stopCameraAndRecorder();
        setSubmittedResult(result);
        queryClient.invalidateQueries({ queryKey: ["myEnrollments"] });
        queryClient.invalidateQueries({ queryKey: ["scorecard", numericId] });
        toast.success(isAuto ? "Time expired — attempt submitted" : "Assessment submitted cleanly");
        if (videoWarning) {
          // Answers are safe; only the proctoring recording is missing. Say so instead of failing silently.
          toast.error(`Your answers were saved, but the proctoring video is missing. ${videoWarning}`, {
            duration: 9000,
          });
        }
      } catch (err) {
        toast.error(err?.response?.data?.detail || "Submission failed. Please retry immediately.");
      } finally {
        setSubmitting(false);
        setUploadStatusText("");
      }
    },
    [attempt?.id, numericId, queryClient, stopCameraAndRecorder, submittedResult, submitting]
  );

  // Server-anchored countdown timer
  useEffect(() => {
    if (!attempt?.expires_at || submittedResult) return;
    const expiryMs = new Date(attempt.expires_at).getTime();

    const tick = () => {
      const left = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        handleSubmitAttempt(true);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [attempt?.expires_at, handleSubmitAttempt, submittedResult]);

  // Periodic 15s autosave + focus/visibility proctoring listeners during live exam
  useEffect(() => {
    if (!attempt?.id || submittedResult) return;

    const saveInterval = setInterval(() => {
      flushAutosave();
    }, 15000);

    const onVisibility = () => {
      if (document.hidden && !isCameraPromptGrace()) {
        pendingEventsRef.current.push({
          event_type: "tab_switch",
          details: { timestamp: new Date().toISOString() },
        });
        setTabSwitches((prev) => {
          const next = prev + 1;
          setProctorWarning(
            maxTabSwitches < 99
              ? `Tab switch detected (${next} / ${maxTabSwitches} max) and recorded.`
              : `Tab switch detected (${next}) and recorded.`
          );
          return next;
        });
        flushAutosave();
      }
    };

    const onBlur = () => {
      if (document.hidden || isCameraPromptGrace()) return;
      pendingEventsRef.current.push({
        event_type: "window_blur",
        details: { timestamp: new Date().toISOString() },
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      clearInterval(saveInterval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [attempt?.id, flushAutosave, isCameraPromptGrace, maxTabSwitches, submittedResult]);

  const handleStartExam = async () => {
    if (requireCamera && !cameraVerified) {
      const ok = await requestWebcam();
      if (!ok) return;
    }
    setStarting(true);
    try {
      const data = await assessmentApi.startOrResumeAttempt(numericId, cameraVerified);
      const initialAnswers = data.answers || {};
      seqRef.current = Number(data.answers_seq || 0);
      keystrokeCountRef.current = Number(initialAnswers.keystroke_count || 0);
      answersRef.current = initialAnswers;
      setAnswers(initialAnswers);
      setAttempt(data);
      setActiveQIndex(0);
      autoSubmittedRef.current = false;
      if (cameraVerified) {
        startRecordingIfAvailable();
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not start assessment sitting.");
    } finally {
      setStarting(false);
    }
  };

  const handleMcqSelect = (questionId, optIdx) => {
    const next = { ...answersRef.current, [questionId]: optIdx };
    answersRef.current = next;
    setAnswers(next);
  };

  const handleMcqClear = (questionId) => {
    const { [questionId]: _removed, ...rest } = answersRef.current;
    answersRef.current = rest;
    setAnswers(rest);
  };

  const handleTypingChange = (text) => {
    const next = {
      typed_text: text,
      keystroke_count: keystrokeCountRef.current,
    };
    answersRef.current = next;
    setAnswers(next);
  };

  // Return to where the person manages their own assessments (their portal differs by role).
  const backTarget = () => {
    const role = localStorage.getItem("role");
    if (role === "pm" || role === "team_lead") {
      navigate("/pm/training-development?tab=mine");
    } else if (role === "employee") {
      navigate("/employee/assessments");
    } else {
      navigate(-1);
    }
  };

  if (scorecardLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Preparing assessment room..." />
      </div>
    );
  }

  if (scorecardError || !scorecard) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
          <AlertTriangle className="h-9 w-9 text-amber-500 mx-auto" />
          <h1 className="text-lg font-semibold text-slate-900">Assessment unavailable</h1>
          <p className="text-sm text-slate-500">
            {scorecardError?.response?.data?.detail || "We could not locate this assessment enrollment."}
          </p>
          <Button variant="outline" onClick={backTarget}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Return to Onboarding
          </Button>
        </div>
      </div>
    );
  }

  const totalAllowed = Number(scorecard.max_attempts || 1) + Number(scorecard.extra_attempts || 0);
  const attemptsLeft = Math.max(0, totalAllowed - Number(scorecard.attempts_used || 0));
  const dlDate = scorecard.effective_deadline ? new Date(scorecard.effective_deadline) : null;
  const deadlineExpired = dlDate && dlDate < new Date();

  // Stage 3: Post-submit result summary
  if (submittedResult) {
    const passed = submittedResult.passed;
    const summary = submittedResult.result_summary || {};
    const breakdownEntries = summary.category_breakdown
      ? Array.isArray(summary.category_breakdown)
        ? summary.category_breakdown
        : Object.entries(summary.category_breakdown).map(([id, v]) => ({ category_id: id, ...v }))
      : [];

    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div className="text-center space-y-2">
            {passed ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
            ) : (
              <XCircle className="h-12 w-12 text-rose-500 mx-auto" />
            )}
            <h1 className="text-xl font-semibold text-slate-900">
              {passed ? "Assessment passed" : "Attempt recorded"}
            </h1>
            <p className="text-sm text-slate-500">{scorecard.assessment_title}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Score</div>
              <div className="text-2xl font-semibold text-slate-900 tabular-nums mt-0.5">
                {submittedResult.score !== null && submittedResult.score !== undefined
                  ? `${submittedResult.score}%`
                  : "—"}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Outcome</div>
              <div className={`text-lg font-semibold mt-1 ${passed ? "text-emerald-600" : "text-rose-600"}`}>
                {passed ? "Passed" : "Did not pass"}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Time spent</div>
              <div className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                {formatClock(submittedResult.time_spent_seconds || 0)}
              </div>
            </div>
          </div>

          {summary.net_wpm !== undefined && (
            <div className="rounded-xl border border-slate-200 p-4 grid grid-cols-2 gap-4 text-sm tabular-nums">
              <div>
                <span className="text-slate-500">Net speed: </span>
                <span className="font-semibold text-slate-900">{summary.net_wpm} WPM</span>
              </div>
              <div>
                <span className="text-slate-500">Accuracy: </span>
                <span className="font-semibold text-slate-900">{summary.accuracy_percent}%</span>
              </div>
            </div>
          )}

          {breakdownEntries.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500">
                Section performance
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {breakdownEntries.map((cat) => (
                  <div
                    key={cat.category_id || cat.category_name}
                    className="rounded-lg border border-slate-200 px-3.5 py-2.5 flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-700 font-medium">{cat.category_name}</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {cat.accuracy_percent ?? 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-center">
            <Button variant="primary" onClick={backTarget}>
              Return to Onboarding Portal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Stage 2: Active Live Attempt Room
  if (attempt) {
    const snap = attempt.question_snapshot || {};
    const isTyping = snap.test_type === "typing";
    const questions = snap.questions || [];
    const currentQ = questions[activeQIndex];

    // MCQ sittings use the shared exam room (same component as the admin preview).
    if (!isTyping) {
      const limitExceeded = maxTabSwitches < 99 && tabSwitches > maxTabSwitches;
      const liveChips = [
        ...(cameraVerified ? [{ icon: Video, label: "Proctoring active", tone: "ok" }] : []),
        ...(tabSwitches > 0
          ? [
              {
                icon: ShieldAlert,
                label:
                  maxTabSwitches < 99
                    ? `Tab switches: ${tabSwitches}/${maxTabSwitches}`
                    : `Tab switches: ${tabSwitches}`,
                tone: limitExceeded ? "danger" : "warn",
              },
            ]
          : []),
      ];

      return (
        <>
          <ExamRoom
            title={scorecard.assessment_title}
            eyebrow={`Attempt #${attempt.attempt_number}`}
            chips={liveChips}
            questions={questions}
            sectionOrder={(snap.categories || []).map((c) => c.name)}
            answers={answers}
            onSelect={handleMcqSelect}
            onClear={handleMcqClear}
            activeIndex={activeQIndex}
            onActiveIndexChange={setActiveQIndex}
            onSaveAndNext={flushAutosave}
            secondsLeft={secondsLeft}
            onSubmit={() => setConfirmSubmitOpen(true)}
            submitting={submitting}
            banner={submitting ? uploadStatusText || "Submitting exam..." : proctorWarning}
            bannerTone={submitting ? "info" : limitExceeded ? "danger" : "warn"}
            rail={cameraVerified ? <CameraMonitorCard videoRef={liveVideoRef} live /> : null}
          />
          <ConfirmDialog
            isOpen={confirmSubmitOpen}
            onClose={() => setConfirmSubmitOpen(false)}
            onConfirm={() => handleSubmitAttempt(false)}
            isPending={submitting}
            variant="info"
            title="Submit assessment now?"
            message="Once submitted, your answers are evaluated immediately and this sitting cannot be reopened."
            confirmText="Yes, submit assessment"
          />
        </>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Exam Header */}
        <header className="bg-white border-b border-slate-200 h-14 px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="min-w-0 flex items-center gap-3">
            <span className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-slate-700" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <h1 className="text-sm font-medium text-slate-900 truncate">{scorecard.assessment_title}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Attempt #{attempt.attempt_number}</span>
                {cameraVerified && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600">
                    <span className="text-slate-300">·</span>
                    <Video className="h-3.5 w-3.5" strokeWidth={1.5} /> Proctoring active
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`px-3 py-1 rounded-lg border font-mono text-sm font-medium tabular-nums flex items-center gap-2 ${
                secondsLeft <= 120
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-slate-50 border-slate-200/80 text-slate-900"
              }`}
            >
              <Clock className={`h-4 w-4 ${secondsLeft <= 120 ? "text-rose-600" : "text-slate-400"}`} strokeWidth={1.5} />
              {formatClock(secondsLeft)}
            </div>
            <Button
              variant="primary"
              size="sm"
              className="h-9 px-4 rounded-lg shadow-none"
              disabled={submitting}
              onClick={() => setConfirmSubmitOpen(true)}
            >
              Submit exam
            </Button>
          </div>
        </header>

        {proctorWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs font-medium text-amber-800 flex items-center justify-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            {proctorWarning}
          </div>
        )}

        {submitting && (
          <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-2.5 text-xs font-medium text-indigo-800 text-center">
            {uploadStatusText || "Submitting exam..."}
          </div>
        )}

        <main className="flex-1 max-w-5xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary Exam Content */}
          <div className="lg:col-span-9 space-y-5">
            {isTyping ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                    <Keyboard className="h-4 w-4 text-teal-600" /> Typing Assessment Passage
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    Target: {snap.target_wpm || 40} WPM · Min Accuracy: {snap.min_accuracy_percent || 90}%
                  </span>
                </div>

                <div
                  onCopy={(e) => e.preventDefault()}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-[15px] leading-relaxed text-slate-800 font-mono select-none"
                >
                  {snap.passage_text}
                </div>

                <div>
                  <textarea
                    rows={8}
                    value={answers.typed_text || ""}
                    onKeyDown={() => {
                      keystrokeCountRef.current += 1;
                    }}
                    onChange={(e) => handleTypingChange(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      setProctorWarning("Paste action blocked during typing test.");
                    }}
                    onDrop={(e) => e.preventDefault()}
                    placeholder="Begin typing the passage above accurately..."
                    className="w-full p-4 rounded-xl border border-slate-300 bg-white text-[15px] font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400 tabular-nums">
                    <span>Characters typed: {(answers.typed_text || "").length}</span>
                    <span>Autosaved monotonically to server</span>
                  </div>
                </div>
              </div>
            ) : currentQ ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                    {currentQ.category_name || "Question"}
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    Question {activeQIndex + 1} of {questions.length} · {currentQ.marks || 1} mark(s)
                  </span>
                </div>

                <h2 className="text-[16px] font-medium text-slate-900 leading-relaxed">
                  {currentQ.question}
                </h2>

                <div className="space-y-2.5">
                  {(currentQ.options || []).map((opt, idx) => {
                    const selected = answers[currentQ.question_id] === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleMcqSelect(currentQ.question_id, idx)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors flex items-center gap-3 ${
                          selected
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full border text-xs font-semibold flex items-center justify-center shrink-0 ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 text-slate-500"
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={activeQIndex <= 0}
                    onClick={() => setActiveQIndex((i) => Math.max(0, i - 1))}
                  >
                    Previous
                  </Button>
                  {activeQIndex < questions.length - 1 ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setActiveQIndex((i) => Math.min(questions.length - 1, i + 1));
                        flushAutosave();
                      }}
                    >
                      Save & Next
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setConfirmSubmitOpen(true)}
                    >
                      Review & Submit
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Proctoring & Navigation Rail */}
          <aside className="lg:col-span-3 space-y-4">
            {cameraVerified && (
              <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
                <div className="text-xs font-medium text-slate-600 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Camera monitor
                  </span>
                  <span className="text-[11px] text-slate-400">WebM</span>
                </div>
                <video
                  ref={liveVideoRef}
                  muted
                  autoPlay
                  playsInline
                  className="w-full rounded-lg bg-slate-950 aspect-video object-cover scale-x-[-1]"
                />
              </div>
            )}

            {!isTyping && questions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-700 tabular-nums">
                  Questions ({Object.keys(answers).length}/{questions.length} answered)
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q.question_id] !== undefined;
                    const isCurrent = idx === activeQIndex;
                    return (
                      <button
                        key={q.question_id}
                        type="button"
                        onClick={() => setActiveQIndex(idx)}
                        className={`h-8 rounded-lg text-xs font-medium tabular-nums border transition-colors ${
                          isCurrent
                            ? "bg-slate-900 text-white border-slate-900"
                            : isAnswered
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </main>

        <ConfirmDialog
          isOpen={confirmSubmitOpen}
          onClose={() => setConfirmSubmitOpen(false)}
          onConfirm={() => handleSubmitAttempt(false)}
          isPending={submitting}
          variant="info"
          title="Submit assessment now?"
          message="Once submitted, your answers are evaluated immediately and this sitting cannot be reopened."
          confirmText="Yes, submit assessment"
        />
      </div>
    );
  }

  // Stage 1: Pre-Flight Proctoring & Check Room
  const hasLiveAttempt = (scorecard.attempts || []).some((a) => a.status === "in_progress");
  const blockedReason =
    scorecard.status === "passed"
      ? "You have already passed this assessment."
      : scorecard.status === "cancelled"
        ? "This assessment enrollment has been cancelled."
        : !hasLiveAttempt && attemptsLeft <= 0
          ? "You have used all allowed attempts for this assessment."
          : deadlineExpired
            ? "The submission deadline for this assessment has passed."
            : "";

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-indigo-600">
              Proctored assessment
            </span>
            <h1 className="text-xl font-medium text-slate-900 mt-0.5">
              {scorecard.assessment_title}
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={backTarget}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {overview?.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{overview.description}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm tabular-nums">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Duration</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {scorecard.duration_minutes} mins
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Attempts left</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {attemptsLeft} / {totalAllowed}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Tab limit</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {maxTabSwitches >= 99 ? "Monitored" : `Max ${maxTabSwitches}`}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-xs text-slate-500">Deadline</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {dlDate ? format(dlDate, "d MMM, HH:mm") : "Open"}
              </div>
            </div>
          </div>

          {blockedReason ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center space-y-2">
              <ShieldCheck className="h-7 w-7 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-800">{blockedReason}</p>
              {scorecard.best_score !== null && scorecard.best_score !== undefined && (
                <p className="text-xs text-slate-500 tabular-nums">
                  Best recorded score: {scorecard.best_score}%
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <Camera className="h-4 w-4 text-indigo-600" />
                  Webcam Proctoring Check {requireCamera ? "(Required)" : "(Optional)"}
                </div>
                {!cameraVerified && (
                  <Button variant="outline" size="sm" onClick={requestWebcam}>
                    Enable camera
                  </Button>
                )}
              </div>

              {cameraError && (
                <p className="text-xs text-rose-600">{cameraError}</p>
              )}

              {cameraVerified && (
                <div className="rounded-xl overflow-hidden bg-slate-950 max-w-xs aspect-video">
                  <video
                    ref={videoPreviewRef}
                    muted
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              )}

              <p className="text-xs text-slate-500">
                Keep this browser tab active during your sitting. Tab switches and window focus losses are recorded automatically.
              </p>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  isLoading={starting}
                  loadingText="Preparing exam..."
                  disabled={requireCamera && !cameraVerified}
                  onClick={handleStartExam}
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  {hasLiveAttempt ? "Resume sitting" : "Start proctored exam"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
