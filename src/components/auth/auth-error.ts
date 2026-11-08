// Better Auth client errors → copy we show to customers
type AuthError = { code?: string; status?: number; message?: string } | null;

const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password.",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists.",
  INVALID_EMAIL: "Enter a valid email address.",
  PASSWORD_TOO_SHORT: "Your password must be at least 8 characters.",
  PASSWORD_TOO_LONG: "Your password must be 128 characters or fewer.",
  ACCOUNT_BLOCKED: "This account has been blocked. Contact client services for help.",
};

// The request never got an answer (offline, server down, blocked origin)
export const AUTH_NETWORK_ERROR =
  "We couldn't reach the server. Check your connection and try again.";

export function getAuthErrorMessage(error: AuthError) {
  if (error?.status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return (error?.code && messages[error.code]) || "Something went wrong. Please try again.";
}
