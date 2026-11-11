const TEMPORARY_FAILURE = "Sign in is temporarily unavailable. Please try again shortly.";

/** Only intentional account messages may cross the sign-in boundary. */
export function publicLoginError(error: unknown): Error {
  if (error instanceof Error) {
    if (
      error.message === "Account locked — contact support" ||
      error.message === "Too many attempts. Please retry in 30 seconds." ||
      /^Invalid username or password(?: \([1-3]\/3 attempts\))?$/.test(error.message)
    ) {
      return new Error(error.message);
    }
  }
  return new Error(TEMPORARY_FAILURE);
}

export function loginFailureCode(error: unknown): string {
  const visited = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    const failure = current as { code?: unknown; cause?: unknown };
    if (typeof failure.code === "string" && /^[A-Z0-9_]{2,64}$/.test(failure.code)) {
      return failure.code;
    }
    current = failure.cause;
  }
  return "SIGN_IN_FAILED";
}
