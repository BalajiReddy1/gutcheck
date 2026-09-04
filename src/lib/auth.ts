import "server-only";

import { adminAuth } from "./firebase.admin";

export class AuthError extends Error {
  status = 401;
}

/**
 * Broken Access Control mitigation (OWASP A01): every API route calls this first.
 * Verifies the Firebase ID token on the server with the Admin SDK and returns
 * the caller's uid. No route trusts a uid supplied in the body or query.
 */
export async function requireUid(req: Request): Promise<string> {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) throw new AuthError("Missing bearer token");

  try {
    const decoded = await adminAuth().verifyIdToken(match[1], true);
    return decoded.uid;
  } catch {
    throw new AuthError("Invalid or expired token");
  }
}
