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
| 2026-10-24 | Server error captured, release tag, source resolution | production | [REVERA-WEBSITE-FRONTEND-2](https://iox-solutions.sentry.io/issues/REVERA-WEBSITE-FRONTEND-2) — `environment: production`, `release` matched the deploy commit SHA, frame resolved to `src/app/api/sentry-test-error/route.ts:2:13`. Throwaway route added then removed in a follow-up commit. | Pass |

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
- [x] Trigger a real error path in production and confirm the stack trace resolves to real source, not minified/bundled output — done for a **server route** (REVERA-WEBSITE-FRONTEND-2). Still outstanding for a **client-side** error — Node/server output isn't minified the same way browser bundles are, so this doesn't by itself prove client source maps uploaded correctly.
- [x] Confirm the issue's `release` tag matches the deployed commit SHA, and `environment` reads `production` — confirmed on REVERA-WEBSITE-FRONTEND-2.
- [ ] Confirm `/monitoring` (the Sentry tunnel route) is not blocked by `middleware.ts` — it isn't, since the matcher is scoped to `/api/:path*` only, but re-check if that matcher ever changes.
- [ ] Trigger a client-side error on the live production site (e.g. temporarily throw in a client component) and confirm the stack trace resolves to real `.tsx`/`.ts` source, not a minified bundle — this is the actual proof the client source-map upload worked.
