import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Wifi, ArrowRight, ShieldCheck, Lock, UserX } from "lucide-react";
import { checkinApi } from "../services/api";

export default function VerifyCheckInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const [errorType, setErrorType] = useState("generic"); // "unauthenticated" | "account_mismatch" | "generic"
  const [errorMessage, setErrorMessage] = useState("");
  const [checkinData, setCheckinData] = useState(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorType("generic");
      setErrorMessage("No confirmation token found in URL. Please click the link directly from your Slack message.");
      return;
    }

    if (requestedRef.current) return;
    requestedRef.current = true;

    checkinApi
      .confirmSlack(token)
      .then((res) => {
        setCheckinData(res);
        setStatus("success");
      })
      .catch((err) => {
        const statusCode = err?.response?.status;
        const detail =
          err?.response?.data?.detail?.[0]?.msg ||
          err?.response?.data?.detail ||
          "Unable to verify your check-in. The link may have expired.";
        const msg = typeof detail === "string" ? detail : "Verification failed.";

        if (statusCode === 401) {
          setErrorType("unauthenticated");
          setErrorMessage("You must be logged in to your Autonex PM Portal account to verify this check-in.");
        } else if (statusCode === 403) {
          setErrorType("account_mismatch");
          setErrorMessage(msg);
        } else {
          setErrorType("generic");
          setErrorMessage(msg);
        }
        setStatus("error");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center transition-all">
        {/* Branding header */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-6">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Autonex Secure Attendance</span>
        </div>

        {status === "loading" && (
          <div className="py-8 space-y-4">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 animate-ping opacity-50"></div>
              <div className="w-12 h-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Verifying Identity & Network...</h2>
            <p className="text-sm text-slate-500">Checking your account login and Wi-Fi network against the check-in request.</p>
          </div>
        )}

        {status === "success" && (
          <div className="py-4 space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Check-In Confirmed!</h2>
              <p className="text-sm text-slate-500 mt-1">Your attendance for today has been verified and recorded.</p>
            </div>

            {checkinData && (
              <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Work Mode:</span>
                  <span className="font-semibold text-slate-800 px-2 py-0.5 rounded bg-white border border-slate-200">
                    {checkinData.work_mode}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Date:</span>
                  <span className="font-medium text-slate-700">{checkinData.checkin_date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Verification:</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <Wifi className="h-3 w-3" /> Identity & Matching Network Verified
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate("/")}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              <span>Go to Portal Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="py-4 space-y-5 animate-in fade-in zoom-in-95 duration-300">
            {errorType === "unauthenticated" ? (
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto ring-8 ring-indigo-50/50">
                <Lock className="h-9 w-9" />
              </div>
            ) : errorType === "account_mismatch" ? (
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
                <UserX className="h-9 w-9" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto ring-8 ring-amber-50/50">
                <AlertTriangle className="h-9 w-9" />
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {errorType === "unauthenticated"
                  ? "Login Required"
                  : errorType === "account_mismatch"
                  ? "Account Mismatch"
                  : "Verification Failed"}
              </h2>
              <div
                className={`mt-3 p-3.5 border rounded-xl text-xs leading-relaxed text-left font-medium ${
                  errorType === "unauthenticated"
                    ? "bg-indigo-50/80 border-indigo-200 text-indigo-900"
                    : errorType === "account_mismatch"
                    ? "bg-rose-50/80 border-rose-200 text-rose-900"
                    : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                {errorMessage}
              </div>
            </div>

            {errorType === "unauthenticated" ? (
              <p className="text-xs text-slate-500 text-left leading-relaxed">
                For security, confirmation links can only be verified when logged into your account. Please log in to complete check-in.
              </p>
            ) : errorType === "account_mismatch" ? (
              <p className="text-xs text-slate-500 text-left leading-relaxed">
                <strong>Anti-Proxy Protection:</strong> Check-in links are strictly single-user. You cannot verify attendance for another employee or forward links.
              </p>
            ) : (
              <p className="text-xs text-slate-500 text-left leading-relaxed">
                <strong>Notice:</strong> This verification link is single-use and expires in 90 seconds. If it failed or expired, please request a fresh link from the portal check-in modal.
              </p>
            )}

            <div className="pt-2 space-y-2">
              {errorType === "unauthenticated" ? (
                <button
                  onClick={() => navigate(`/login/employee?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
                >
                  <Lock className="h-4 w-4" />
                  <span>Log In to PM Portal</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate("/")}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
                >
                  <span>Back to PM Portal</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
