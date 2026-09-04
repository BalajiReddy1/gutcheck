# Gutcheck - Functional Walkthrough (Directive 6)

Every user-visible process has a test case. These are written so another tool
(or a human) can turn them into scripts. Format: **Given / When / Then**.

## A. Authentication

| # | Given | When | Then |
| --- | --- | --- | --- |
| A1 | Signed out, on `/` | Click "Continue with Google", complete Google popup | Redirected to `/dashboard`; header shows display name |
| A2 | Signed in, on `/dashboard` | Click "Sign out" | Redirected to `/`; `/dashboard` now redirects back to `/` |
| A3 | Signed out | Navigate directly to `/dashboard` | Redirected to `/` (no flash of private content) |
| A4 | Signed in | `curl` any `/api/*` route with no `Authorization` header | `401` JSON, no data |
| A5 | Signed in as user X | Call `GET /api/entries/<an id belonging to user Y>` with X's token | `404` (X cannot address Y's docs) |

## B. Journal + Gemini (multi-turn)

| # | Given | When | Then |
| --- | --- | --- | --- |
| B1 | New entry, empty thread | Type a reflection, click Send | User bubble + Gemini reply appear; entry shows in History with a generated title |
| B2 | Existing entry open | Send a follow-up message | Reply is contextual to earlier turns; `turns` count increases by 2 |
| B3 | Mid-send | (simulate) Gemini returns 503 | Error banner with "Retry save"; typed text is NOT cleared; retry succeeds |
| B4 | Entry saved | Sign out, sign back in, open History | The entry and all turns are still there |
| B5 | Entry with mood sliders set | Send | `mood` persisted; visible later in Insights chart |

## C. Decision Ledger

| # | Given | When | Then |
| --- | --- | --- | --- |
| C1 | Decisions tab | Fill statement + rationale + prediction, set confidence 75%, Log decision | Card appears with 3-5 Gemini red-team bullet points |
| C2 | Missing a required field | Click Log decision | Inline validation message; no network call |
| C3 | Open decision | Expand "Record the outcome", enter outcome, set slider, Save | Card flips to "resolved" with the outcome shown |
| C4 | 3+ decisions resolved | View Calibration panel | Brier score shown; tendency = overconfident / underconfident / well-calibrated |
| C5 | < 3 resolved | View Calibration panel | "Resolve at least 3 decisions… (n/3)" |
| C6 | `reviewDueAt` in the past | Open Decisions tab | Card shows "review due" pill; outcome form is expanded by default |

## D. Insights

| # | Given | When | Then |
| --- | --- | --- | --- |
| D1 | ≥ 1 mood-tagged entry in 45 days | Open Insights | Line chart renders energy/mood/overwhelm |
| D2 | ≥ 4 mood points | Open Insights | Burnout signal is a real sentence (warn styling if a downward trend) |
| D3 | ≥ 2 entries this week | Click "Generate this week" | Season Recap: episode title + recap paragraph + "actual takeaway" |
| D4 | < 2 entries this week | Click Generate | Clean `400` message, no crash |
| D5 | Digest exists | Reload Insights | Previously generated digest still displayed |

## E. Search

| # | Given | When | Then |
| --- | --- | --- | --- |
| E1 | Several entries | Search a plain-language question | Up to 6 semantically relevant entries listed, best first |
| E2 | Query matching nothing | Search | "Nothing matched" message |
| E3 | No entries yet | Search | Empty result, no error |

## F. Infra / deploy

| # | Check | Pass condition |
| --- | --- | --- |
| F1 | `GET /api/health` on the live URL | `{ "status": "ok", "geminiKey": true }` |
| F2 | `grep -r "AIzaSy" src/` and client bundle | No Gemini key; only `NEXT_PUBLIC_FIREBASE_*` web config |
| F3 | `gcloud run services describe gutcheck` | Label `dev-tutorial: cloud-run-ai-challenge` present |
| F4 | Firestore rules in console | Match `firestore.rules`; no `if true` |
| F5 | Two Google accounts | Neither can read the other's entries in UI or via API |
