import "server-only";

import { getApps, initializeApp, applicationDefault, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | undefined;

function initAdmin(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Explicit service-account JSON (local dev) takes precedence if provided as a
  // raw string; otherwise fall back to Application Default Credentials, which is
  // what Cloud Run provides via the runtime service account. No secrets are ever
  // hardcoded here.
  const rawSa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawSa) {
    const parsed = JSON.parse(rawSa);
    app = initializeApp({ credential: cert(parsed), projectId: parsed.project_id ?? projectId });
  } else {
    app = initializeApp({ credential: applicationDefault(), projectId });
  }
  return app;
}

export function adminAuth(): Auth {
  return getAuth(initAdmin());
}

export function adminDb(): Firestore {
  const db = getFirestore(initAdmin());
  return db;
}
