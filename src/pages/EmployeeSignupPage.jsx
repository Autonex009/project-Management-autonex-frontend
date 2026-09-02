import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import Spinner from "../components/ui/LoadingSpinner";
import {
  User,
  Mail,
  Phone,
  CheckCircle,
  MailCheck,
  ShieldCheck,
  AlertTriangle,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { signupRequestApi } from "../services/api";
import AuthBrandPanel from "../components/brand/AuthBrandPanel";
import Dropdown from "../components/ui/Dropdown";

const DESIGNATIONS = [
  "Annotator/ Reviewer",
  "Developer",
  "Program Manager",
  "Quality Analyst",
  "Data Scientist",
  "Other",
];

const EMPLOYEE_TYPES = ["Full-time", "Part-time", "Intern", "Contractor"];

const WORK_CATEGORIES = [
  "Yutori Verifier",
  "Yutori Annotation",
  "Robotics Annotation",
  "Development",
  "Robotics Data Collection",
  "Data Labeling",
  "Quality Review",
  "Smart Factory Development",
];

const CARD_CLASS =
  "w-full max-w-lg rounded-[28px] border border-slate-200 bg-white/95 p-5 sm:p-8 shadow-[0_25px_80px_rgba(15,23,42,0.1)] backdrop-blur my-4 sm:my-8";

const PANEL_CLASS =
  "flex flex-1 items-start justify-center p-4 sm:p-8 bg-gradient-to-br from-emerald-50 to-slate-50 overflow-y-auto";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

/**
 * Employee signup — two steps, because an unverified address created admin work.
 *
 * 1. No ?token in the URL → ask only for an email and mail a signup link to it.
 * 2. Link opened (?token=…) → the real form, with the email locked to the verified
 *    address. The backend reads the email out of the token and ignores anything
 *    the client sends, so a typo can never reach the admin's approval queue.
 */
const EmployeeSignupPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // ── Step 1 state ──────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(null); // response from verify-email once sent

  // ── Step 2 state ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    phone: "",
    designation: "",
    employee_type: "Intern",
    skills: [],
    reason: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // Validate the link's token; gives us the verified address to pre-fill and lock.
  const {
    data: verified,
    isLoading: verifying,
    error: verifyError,
  } = useQuery({
    queryKey: ["signup-verify", token],
    queryFn: () => signupRequestApi.checkEmailVerification(token),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });

  const sendLinkMutation = useMutation({
    mutationFn: () => signupRequestApi.requestEmailVerification(email.trim()),
    onSuccess: (data) => setSent(data),
    onError: (err) =>
      toast.error(
        err.response?.data?.detail || "Could not send the verification link",
      ),
  });

  const submitMutation = useMutation({
    mutationFn: signupRequestApi.submit,
    onSuccess: () => setSubmitted(true),
    onError: (err) =>
      toast.error(err.response?.data?.detail || "Failed to submit request"),
  });

  const handleSendLink = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    sendLinkMutation.mutate();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    // No email in the payload on purpose — the server takes it from the token.
    submitMutation.mutate({ ...form, verification_token: token });
  };

  // ── Final success screen ──────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Request Submitted!
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Your signup request has been received and is pending review by the
            Admin. You'll receive an email at{" "}
            <strong className="text-slate-700">{verified?.email}</strong> once
            your account is approved with login instructions.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Questions? Contact your manager or reach out on{" "}
            <strong>#autonex-tool-support</strong> in Slack.
          </p>
          <Link
            to="/login/employee"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-[0_10px_25px_rgba(5,150,105,0.2)]"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ── Step 1: no token — verify the email first ─────────────────────
  if (!token) {
    return (
      <div className="min-h-screen flex">
        <AuthBrandPanel
          accent="employee"
          eyebrow="Employee Onboarding"
          title="Join the Autonex team"
          description="Start by confirming your email. We'll send you a link to the signup form so your account is always tied to an address you can actually reach."
          flowSteps={[
            {
              title: "Sign up request",
              copy: "Submit your email, and you will get a link for sign up.",
            },
            {
              title: "Admin approval",
              copy: "After approval, you will get a link with a temporary password in your same email.",
            },
            {
              title: "Change password",
              copy: "Log in using your temporary password, then change it using the reset password button.",
            },
            {
              title: "Sign in",
              copy: "Log into your employee portal securely.",
            },
          ]}
        />

        <div className={PANEL_CLASS}>
          <div className={CARD_CLASS}>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {sent ? "Check your inbox" : "Verify your email"}
                </h1>
                <p className="mt-0.5 text-xs text-slate-400">
                  {sent ? "Step 2 of 2" : "Step 1 of 2"} · Join the Autonex
                  Workspace
                </p>
              </div>
              <Link
                to="/login/employee"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-all hover:bg-slate-100 hover:border-slate-300"
              >
                Sign In
              </Link>
            </div>

            {sent ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="text-sm text-emerald-900">
                    <p className="font-semibold">
                      Signup link sent to {sent.email}
                    </p>
                    <p className="mt-1 text-emerald-800/90">
                      Open it to fill in the rest of your details. The link
                      expires in {sent.expires_in_minutes} minutes.
                    </p>
                  </div>
                </div>

                {/* Only present when the server runs with DEV_RETURN_SIGNUP_LINK=true. */}
                {sent.verification_link && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                    <p className="font-semibold text-amber-900">
                      Dev mode — email skipped
                    </p>
                    <a
                      href={sent.verification_link}
                      className="mt-1 block break-all text-xs text-amber-800 underline"
                    >
                      {sent.verification_link}
                    </a>
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  Didn't get it? Check your spam folder, or{" "}
                  <button
                    type="button"
                    onClick={() => setSent(null)}
                    className="font-semibold text-emerald-600 hover:underline"
                  >
                    use a different email
                  </button>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendLink} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-3 shadow-sm">
                    <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
                    <p className="text-sm font-semibold text-blue-900 leading-relaxed">
                      We'll email you a link to the signup form. Your account will
                      use this exact address, so double-check it.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendLinkMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-70 bg-emerald-600 shadow-[0_16px_38px_rgba(5,150,105,0.24)] hover:bg-emerald-700"
                >
                  {sendLinkMutation.isPending ? (
                    <Spinner size="sm" color="white" text="Sending..." />
                  ) : (
                    "Send Verification Link"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Token present but still being checked ─────────────────────────
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 p-6">
        <Spinner size="lg" text="Verifying your link..." />
      </div>
    );
  }

  // ── Token rejected (expired, tampered, or already registered) ─────
  if (verifyError) {
    const detail =
      verifyError.response?.data?.detail ||
      "This verification link is invalid or has expired.";
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">
            Link no longer valid
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">{detail}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/employee-signup"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Request a new link
            </Link>
            <Link
              to="/login/employee"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: verified — the real form, email locked ────────────────
  return (
    <div className="min-h-screen flex">
      <AuthBrandPanel
        accent="employee"
        eyebrow="Employee Onboarding"
        title="Join the Autonex team"
        description="Your email is confirmed. Fill in the rest of your details to request access to the Autonex Resource Planning Portal — an admin will review and approve your account."
        highlights={[
          {
            title: "Quick Review",
            copy: "Admin reviews requests within one business day.",
          },
          {
            title: "Instant Access",
            copy: "Receive login credentials via email upon approval.",
          },
        ]}
      />

      <div className={PANEL_CLASS}>
        <div className={CARD_CLASS}>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Employee Signup
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Step 2 of 2 · Join the Autonex Workspace
              </p>
            </div>
            <Link
              to="/login/employee"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-all hover:bg-slate-100 hover:border-slate-300"
            >
              Sign In
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Verified email — read-only. Changing it would defeat the verification,
                and the server ignores any email sent in the body anyway. */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 py-2.5 px-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="flex-1 truncate text-sm font-medium text-slate-800">
                  {verified?.email}
                </span>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Verified
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Wrong address?{" "}
                <Link
                  to="/employee-signup"
                  className="font-semibold text-emerald-600 hover:underline"
                >
                  Start over with a different email
                </Link>
                .
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Your full name"
                  required
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+91 9876543210"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* Designation + Employee Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Designation
                </label>
                <Dropdown
                  options={["", ...DESIGNATIONS]}
                  value={form.designation}
                  onChange={(e) => setForm((f) => ({ ...f, designation: e }))}
                  placeholder="Select..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Employment Type
                </label>
                <Dropdown
                  options={EMPLOYEE_TYPES}
                  value={form.employee_type}
                  onChange={(e) => setForm((f) => ({ ...f, employee_type: e }))}
                  placeholder="Select..."
                />
              </div>
            </div>

            {/* Work Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Work Category
              </label>
              <Dropdown
                options={["", ...WORK_CATEGORIES]}
                value={form.skills[0] || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, skills: e ? [e] : [] }))
                }
                placeholder="Select a work category..."
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Work Description{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="Describe the work you did in previous projects"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none resize-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-70 bg-emerald-600 shadow-[0_16px_38px_rgba(5,150,105,0.24)] hover:bg-emerald-700"
            >
              {submitMutation.isPending ? (
                <Spinner size="sm" color="white" text="Submitting..." />
              ) : (
                "Submit Signup Request"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSignupPage;
