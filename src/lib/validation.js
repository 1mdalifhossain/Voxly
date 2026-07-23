export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", score, color: "bg-red-400" };
  if (score <= 3) return { label: "Fair", score, color: "bg-amber-400" };
  if (score <= 4) return { label: "Good", score, color: "bg-brand-400" };
  return { label: "Strong", score, color: "bg-emerald-500" };
}

export function friendlyAuthError(error) {
  if (!error) return null;
  const message = error.message || String(error);

  const map = [
    { match: /invalid login credentials/i, text: "Incorrect email or password. Please try again." },
    { match: /email not confirmed/i, text: "Please verify your email address before signing in." },
    { match: /user already registered/i, text: "An account with this email already exists." },
    { match: /password should be at least/i, text: "Password must be at least 6 characters long." },
    { match: /rate limit/i, text: "Too many attempts. Please wait a moment and try again." },
    { match: /same as the old password/i, text: "New password must be different from your current password." },
  ];

  const found = map.find(({ match }) => match.test(message));
  return found ? found.text : message;
}
