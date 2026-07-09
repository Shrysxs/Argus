import { createHash } from "node:crypto";

/** SHA-256 of the JSON-serialized object, returned as a hex string. */
export function sha256(obj: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(obj))
    .digest("hex");
}
