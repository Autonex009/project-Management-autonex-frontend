// One reading of a failed sign-in, shared by the three login pages so they can't
// word the same failure differently.
//
// POST /auth/login answers with an object detail — { code, field, message } — so
// the form can say exactly what went wrong ("no account for this email" vs "wrong
// password") AND mark the input that caused it. Other endpoints still answer with
// a plain string, and FastAPI's own validation errors answer with an array, so all
// three shapes are handled here rather than at every call site. Never returns a
// non-string message: handing React an object to render blanks the page.

const FALLBACK = "Could not sign in. Please try again.";

export const parseAuthError = (err, fallback = FALLBACK) => {
  const detail = err?.response?.data?.detail;

  // { code, field, message } — the login endpoint's shape.
  if (detail && !Array.isArray(detail) && typeof detail === "object") {
    return {
      message:
        typeof detail.message === "string" && detail.message.trim()
          ? detail.message
          : fallback,
      field: typeof detail.field === "string" ? detail.field : null,
      code: typeof detail.code === "string" ? detail.code : null,
    };
  }

  // Plain string detail — every other endpoint, and older deployments of this one.
  if (typeof detail === "string" && detail.trim()) {
    return { message: detail, field: null, code: null };
  }

  // No response at all means the request never landed; saying "invalid
  // credentials" here sends people to reset a password that was fine.
  if (err && !err.response) {
    return {
      message: "Can't reach the server. Check your connection and try again.",
      field: null,
      code: "network",
    };
  }

  return { message: fallback, field: null, code: null };
};

export default parseAuthError;
