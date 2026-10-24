# Sentry Setup Manual Test Checklist — Error Monitoring, Tracing, Session Replay

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** Sentry org `iox-solutions`, project `revera-website-frontend`
> (https://iox-solutions.sentry.io/projects/revera-website-frontend/). Dev checks use
> `npm run dev`; production checks require the next production deploy to have
> `SENTRY_AUTH_TOKEN` set (see DECISIONS.md → DEC-119).

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-24 | Server error captured (API route) | dev | [REVERA-WEBSITE-FRONTEND-1](https://iox-solutions.sentry.io/issues/REVERA-WEBSITE-FRONTEND-1) — frame resolved to `src/app/api/sentry-test-error/route.ts:2:9` | Pass |

## Per-check list

### Server errors captured (done once above, re-check after any instrumentation change)

- [x] Throw in an API route (`app/api/.../route.ts`). Confirm the issue appears in Sentry within ~30s with a readable stack trace pointing at the real source file/line, not a Sentry internal frame.

### Client errors captured

- [ ] Throw inside a client component (e.g. an `onClick` handler with `"use client"`). Confirm the issue lands in Sentry tagged `environment: development`, with the browser/OS tags populated.

### Edge errors captured

- [ ] Throw inside `middleware.ts` or an edge route handler (`export const runtime = "edge"`). Confirm it reaches Sentry via `sentry.edge.config.ts`.

### Root render errors captured (App Router `global-error.tsx`)

- [ ] Temporarily throw during render in a root layout/page. Confirm `global-error.tsx` renders the fallback AND the error shows up in Sentry (via `Sentry.captureException` in `useEffect`).

### Session Replay

- [ ] Trigger a client error as above, then check the **Replays** tab on that issue in Sentry — confirm a replay recording is attached.

### Production — after next deploy with `SENTRY_AUTH_TOKEN` set

- [ ] Confirm the Vercel build log shows source maps uploading (`next.config.ts` → `withSentryConfig`, `silent: !process.env.CI`).
- [ ] Trigger a real error path in production (or wait for an organic one) and confirm the stack trace resolves to real source — not minified/bundled output — in the Sentry issue.
- [ ] Confirm the issue's `release` tag matches the deployed commit SHA, and `environment` reads `production`.
- [ ] Confirm `/monitoring` (the Sentry tunnel route) is not blocked by `middleware.ts` — it isn't, since the matcher is scoped to `/api/:path*` only, but re-check if that matcher ever changes.
