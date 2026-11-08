import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export const cspNonce = createIsomorphicFn()
  .server(() => getRequestHeader("x-maxhigh-csp-nonce"))
  .client(() => document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce);
