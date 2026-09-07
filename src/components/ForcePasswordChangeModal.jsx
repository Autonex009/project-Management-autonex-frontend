import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Check } from "lucide-react";
import toast from "react-hot-toast";
import { authApi } from "../services/api";

export default function ForcePasswordChangeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkUserStatus = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        setIsOpen(false);
        return;
      }
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      
      const isAuthRoute = 
        window.location.pathname.startsWith('/login') ||
        window.location.pathname.startsWith('/forgot-password') ||
        window.location.pathname.startsWith('/reset-password') ||
        window.location.pathname.startsWith('/employee-signup');

      if (user && user.must_change_password && !isAuthRoute) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } catch {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    checkUserStatus();
    // Listen for storage events (e.g. login in another tab or state updates)
    window.addEventListener("storage", checkUserStatus);
    window.addEventListener("auth-change", checkUserStatus);
    return () => {
      window.removeEventListener("storage", checkUserStatus);
      window.removeEventListener("auth-change", checkUserStatus);
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    
    if (!/\d/.test(newPassword)) {
      setError("Password must contain at least one number.");
      return;
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setError("Password must contain at least one special character.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await authApi.changePassword({
        new_password: newPassword,
      });

      // Update stored user in localStorage
      const mergedUser = {
        ...(currentUser || {}),
        ...updatedUser,
        must_change_password: false,
      };
      localStorage.setItem("user", JSON.stringify(mergedUser));
      setCurrentUser(mergedUser);
      setIsOpen(false);
      toast.success("Permanent password set successfully! Welcome to your dashboard.", {
        duration: 4000,
      });
    } catch (err) {
      const msg =
        err?.response?.data?.detail?.message ||
        err?.response?.data?.detail ||
        "Failed to update password. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-indigo-50/50 dark:ring-indigo-950/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Action Required: Set New Password
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Welcome, <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser?.name || "Team Member"}</span>. You are logged in with a temporary password. Please create your permanent password to continue.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new permanent password"
                required
                minLength={8}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new permanent password"
                required
                minLength={8}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${newPassword.length >= 8 ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} />
              <span>Minimum 8 characters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${/\d/.test(newPassword) ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} />
              <span>At least 1 number</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} />
              <span>At least 1 special character</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${newPassword && newPassword === confirmPassword ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} />
              <span>Passwords match</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || newPassword !== confirmPassword}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Save Password & Unlock Dashboard"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
