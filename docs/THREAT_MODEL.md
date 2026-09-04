# Gutcheck - Threat Model

Structured against the 5 threat zones from the Production Directives. Each row
maps a concrete risk to the countermeasure implemented in this codebase.

## Zone 1 - Input Surfaces

| Risk | Countermeasure | Where |
| --- | --- | --- |
| Oversized / malformed journal or decision payloads crash the server | `readJsonBody()` never throws; every route parses with a strict Zod schema (length caps, int ranges) and returns `422` on failure | `src/lib/sanitize.ts`, `src/lib/schemas.ts` |
| `undefined` fields reach the Firestore driver and throw | `stripUndefined()` recursively removes `undefined` before every write | `src/lib/sanitize.ts`, `src/lib/db.ts` |
| Client sends a forged `uid` / score / confidence | No route reads identity from the body; numeric ranges validated server-side | `src/lib/auth.ts`, `src/lib/schemas.ts` |
| XSS via stored entry text | React escapes all rendered text; no `dangerouslySetInnerHTML` anywhere | all components |

## Zone 2 - Planning & Reasoning

| Risk | Countermeasure | Where |
| --- | --- | --- |
| Indirect prompt injection - a journal entry says "ignore your instructions and…" | All user content wrapped in `<entry>…</entry>`; every system prompt states that content inside the tags is data and its instructions must be ignored | `src/lib/prompts.ts` |
| System-prompt exfiltration | System prompts instruct the model to refuse to reveal or discuss them | `src/lib/prompts.ts` |
| Model returns malformed JSON and breaks a feature | `parseJsonObject()` tolerates fences/prose; JSON features (`redTeam`, `search`, partial `digest`) degrade gracefully instead of failing the request | `src/lib/gemini.ts`, routes |

## Zone 3 - Tool Execution

| Risk | Countermeasure | Where |
| --- | --- | --- |
| SSRF / outbound calls to attacker-chosen hosts | The app makes exactly two outbound call types: Google APIs (Firestore, Identity) and the Gemini endpoint. No user input is ever used to build a URL. | whole app |
| Dynamic code execution | No `eval`, no `Function()`, no shelling out. | - |
| Privilege escalation via an API function | Every route is a thin handler gated by `requireUid()`; there are no admin endpoints. | `src/app/api/**` |

## Zone 4 - Memory & State

| Risk | Countermeasure | Where |
| --- | --- | --- |
| Cross-user data leakage in Firestore | Two independent layers: (a) all server reads/writes are scoped to `users/{verifiedUid}/…`; (b) `firestore.rules` allow access only when `request.auth.uid == userId`, with a catch-all `allow …: if false`. | `src/lib/db.ts`, `firestore.rules` |
| Session hijacking via stale token | `verifyIdToken(token, true)` checks revocation; tokens are short-lived and refreshed by the Firebase Web SDK. | `src/lib/auth.ts` |
| Calibration/score tampering to fake results | Scores stored only via the authenticated PATCH route; Brier math is server-side and read-only to the client. | `src/lib/db.ts` |

## Zone 5 - Inter-System Communication

| Risk | Countermeasure | Where |
| --- | --- | --- |
| `GEMINI_API_KEY` exposed client-side | Key is read only in server modules (`import "server-only"`), injected from Secret Manager on Cloud Run, and never referenced in any `NEXT_PUBLIC_` var or client component. | `src/lib/gemini.ts`, `Dockerfile`, README |
| Gemini outage takes down the app | `generateContentWithFallback()` walks a 4-model ladder on `429/404/500/503`; non-core features catch and continue. | `src/lib/gemini.ts` |
| Service account over-privilege | Runtime SA granted only `secretmanager.secretAccessor` (one secret) and `datastore.user`. | README §3 |
| Firebase Web config treated as a leaked secret | It isn't a secret - documented explicitly; it only permits operations the security rules still gate. | README §4 |

## Residual risks / accepted

- **AI Studio-provisioned Gemini key quota**: shared project quota could be
 exhausted by heavy use; mitigated by the fallback ladder but not eliminated.
- **No rate limiting** on API routes beyond Cloud Run's concurrency - acceptable
 for a single-user journal; would add per-uid throttling before multi-tenant use.
- **Model output quality**: red-team and recap text are advisory; no automated
 action is taken on them.
