import { gzipSync, gunzipSync } from "node:zlib";

const prefix = "gz1:";
const maximumBytes = 16 * 1024 * 1024;
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** Lossless, versioned storage only. Public receipts and result hashes stay JSON. */
export function encodeOperation(value: unknown): string {
  const json = JSON.stringify(value ?? null);
  if (Buffer.byteLength(json) > maximumBytes)
    throw new Error("Operation receipt exceeds storage limit");
  if (process.env.OPERATION_COMPRESSION !== "1" || Buffer.byteLength(json) < 4096) return json;
  const encoded = prefix + gzipSync(json, { level: 3 }).toString("base64");
  return encoded.length < json.length ? encoded : json;
}

export function decodeOperation<T = JsonValue>(value: string): T {
  const json = value.startsWith(prefix)
    ? gunzipSync(Buffer.from(value.slice(prefix.length), "base64"), {
        maxOutputLength: maximumBytes,
      }).toString("utf8")
    : value;
  return JSON.parse(json) as T;
}
