/**
 * Shared client-side login validation (Employee / Admin / PM).
 * Returns { ok: true } or { ok: false, errors: { email?, password? } }.
 */
export function validateLoginForm({ email, password }) {
  const errors = {};
  const trimmedEmail = (email || "").trim();

  if (!trimmedEmail) {
    errors.email = "Email is required";
  } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
    errors.email = "Invalid email format";
  }

  if (!(password || "")) {
    errors.password = "Password is required";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

/** First error message — for portals that use a single banner. */
export function firstLoginError(errors) {
  return errors.email || errors.password || "Please fill in all fields";
}