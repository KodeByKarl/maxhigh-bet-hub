import assert from "node:assert/strict";
import { loginFailureCode, publicLoginError } from "../../src/server/auth/login-errors.server";

for (const message of [
  "Invalid username or password",
  "Invalid username or password (1/3 attempts)",
  "Invalid username or password (2/3 attempts)",
  "Account locked — contact support",
]) {
  assert.equal(publicLoginError(new Error(message)).message, message);
}
for (const code of [
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ER_ACCESS_DENIED_ERROR",
  "ER_BAD_FIELD_ERROR",
  "ER_NO_SUCH_TABLE",
]) {
  const cause = Object.assign(new Error("Private database detail"), { code });
  const failure = new Error("Failed query: SELECT password_hash FROM users; params: private-user", {
    cause,
  });
  const safe = publicLoginError(failure);
  assert.equal(safe.message, "Sign in is temporarily unavailable. Please try again shortly.");
  assert.equal(safe.cause, undefined);
  assert.equal(loginFailureCode(failure), code);
  assert.doesNotMatch(safe.message, /SELECT|params|password_hash|private-user/);
}
assert.equal(loginFailureCode({ code: "unsafe detail with spaces" }), "SIGN_IN_FAILED");
const circular: { cause?: unknown } = {};
circular.cause = circular;
assert.equal(loginFailureCode(circular), "SIGN_IN_FAILED");
for (const failure of [null, undefined, "private detail", { message: "Failed query" }]) {
  assert.equal(
    publicLoginError(failure).message,
    "Sign in is temporarily unavailable. Please try again shortly.",
  );
}
console.log(
  "PASS: expected account errors preserved; database queries, parameters, and nested details remain private.",
);
