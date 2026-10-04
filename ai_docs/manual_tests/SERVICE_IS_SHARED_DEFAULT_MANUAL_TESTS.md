# Service "Is Shared" Default Manual Test Checklist

> **Living document.** Update this file with dated dev evidence as each check is run.
> **Environment:** linked dev database.
> Request: default the "Is Shared" toggle to ON when creating a new service, instead of OFF.

## Evidence log

| Date | Check | Environment | Evidence | Result |
|---|---|---|---|---|
| 2026-10-04 | Services → category → "+ Add Service" → scroll to toggles | dev (browser) | "Is Shared" toggle pre-checked (green/ON) on open | Pass |

## Per-check list

- [x] Open any category's "+ Add Service". Confirm the "Is Shared" toggle starts ON (green).
- [ ] Save a new service without touching the toggle. Confirm it is created with Is Shared = true (check via Edit Service, or `GET /api/services`).
- [ ] Toggle it OFF before saving. Confirm it saves as false — the default doesn't override an explicit choice.
- [ ] Edit an existing service that was previously saved with Is Shared = false. Confirm the toggle still correctly shows OFF (editing an existing record must read its real stored value, not the new-service default).
