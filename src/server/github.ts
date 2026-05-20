import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGitHubSignature(rawBody: string, signature: string | undefined, secret: string) {
  if (!signature) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function branchFromGitRef(ref: string | undefined) {
  return ref?.startsWith("refs/heads/") ? ref.replace("refs/heads/", "") : ref;
}
