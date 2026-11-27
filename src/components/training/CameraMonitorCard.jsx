import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";
import Button from "../ui/Button";

/**
 * The camera panel on the exam screen's right rail.
 *
 * Presentational: it shows a mirrored live feed when `live`, otherwise a quiet placeholder that says
 * what will appear here. Used by the real exam (feed is the candidate's recording stream) and by the
 * admin preview (feed is the admin's own webcam, never recorded or sent anywhere).
 */
export function CameraMonitorCard({
  videoRef,
  live = false,
  liveLabel = "Recording",
  note = "Your live camera appears here during the test",
  onEnable,
  enableLabel = "Enable camera",
  error = "",
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-rose-500" : "bg-slate-300"}`} />
          Camera monitor
        </span>
        <span className={`tabular-nums ${live ? "font-medium text-rose-600" : "text-slate-500"}`}>
          {live ? liveLabel : "Off"}
        </span>
      </div>

      <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-50 border border-slate-200/80">
        {live ? (
          <video
            ref={videoRef}
            muted
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <CameraOff className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
            <span className="text-xs leading-snug text-slate-500">{note}</span>
            {onEnable && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 rounded-lg shadow-none text-xs"
                onClick={onEnable}
              >
                {enableLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

/** Admin preview version: opt-in use of the author's own webcam so the layout is seen for real. */
export function PreviewCameraMonitor({ onPermissionPendingChange }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // Release the camera when the preview closes
  useEffect(() => stop, []);

  useEffect(() => {
    if (live && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [live]);

  const enable = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't open a camera here.");
      return;
    }
    onPermissionPendingChange?.(true);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      setLive(true);
    } catch {
      setError("Camera access was blocked or no camera was found.");
    } finally {
      onPermissionPendingChange?.(false);
    }
  };

  return (
    <CameraMonitorCard
      videoRef={videoRef}
      live={live}
      liveLabel="Live · not recorded"
      note="Candidates see their own live camera here. Optional in this preview."
      onEnable={enable}
      error={error}
    />
  );
}

export default CameraMonitorCard;
