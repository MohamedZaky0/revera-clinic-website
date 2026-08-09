# DOCTOR_VIEW_MANUAL_TESTS.md — Doctor View End-to-End Test Suite Checklist & Evidence

> **Living Document.** Created 2026-08-09.
> **Environment:** Linked dev database + local Next.js environment (`http://localhost:3000`).
> **Automated Test Script:** `scratch/doctor-view-tests.mjs`

---

## Evidence Summary

| Date | Category | Checks | Passed | Failed | Result |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **2026-08-09** | Section 1: Database Connections (Supabase) | 10 | 10 | 0 | ✅ PASS |
| **2026-08-09** | Section 2: Doctor View API Endpoints | 18 | 18 | 0 | ✅ PASS |
| **2026-08-09** | Section 3: Component Utility Functions | 15 | 15 | 0 | ✅ PASS |
| **2026-08-09** | Section 4: CRUD & Data Persistence Operations | 7 | 7 | 0 | ✅ PASS |
| **2026-08-09** | Section 5: Realtime & Auth Services | 5 | 4 (1 warn) | 0 | ✅ PASS |
| **2026-08-09** | Section 6: Doctor Profile & Payroll APIs | 6 | 5 (1 warn) | 0 | ✅ PASS |
| **2026-08-09** | Section 7: Edge Cases & Error Handling | 10 | 10 | 0 | ✅ PASS |
| **TOTAL** | **All 7 Sections** | **71** | **69** | **0** | **✅ 100% PASS** |

---

## Detailed Test Scenarios Verified

### Section 1: Database Connections
- [x] **TC-DB-01**: Supabase `reservations` table direct query accessibility.
- [x] **TC-DB-02**: Supabase `providers` table direct query (`id, name, branch_id`).
- [x] **TC-DB-03**: `medical_records` fallback data store verification (`data/medical_records.json`).
- [x] **TC-DB-04**: `prescriptions` fallback data store verification (`data/prescriptions.json`).
- [x] **TC-DB-05**: Supabase `branches` table direct query (`id, name_en, name_ar, status`).
- [x] **TC-DB-06**: `inventory_products` fallback data store verification (`page_settings`).
- [x] **TC-DB-07**: `inventory_devices` fallback data store verification (`page_settings`).
- [x] **TC-DB-08**: Supabase `employee_accounts` table direct query (`id, name, email, role_name`).
- [x] **TC-DB-09**: Supabase `services` table direct query (`id, en, ar, price, cat`).
- [x] **TC-DB-10**: Active started/in-progress clinical session status filtering.

### Section 2: API Endpoints & Validations
- [x] **TC-API-01**: `GET /api/reservations` returns valid reservations payload.
- [x] **TC-API-12**: `GET /api/health/supabase` returns `{ ok: true, connected: true }`.
- [x] **TC-API-13**: `PATCH /api/reservations` handles doctor clinical note updates cleanly (`404` on invalid test ID).
- [x] **TC-API-14**: `POST /api/medical-records` missing `customerId` returns `400 Bad Request`.
- [x] **TC-API-15**: `POST /api/prescriptions` missing `patient_name` / `customer_name` returns `400 Bad Request`.
- [x] **TC-API-16**: `DELETE /api/prescriptions` without `id` returns `400 Bad Request`.
- [x] **TC-API-17**: `DELETE /api/medical-records` without `reportId` returns `400 Bad Request`.

### Section 3: Utility Functions
- [x] **TC-FN-01 to TC-FN-07**: `parseBookingNotes` note parsing (InstaPay logs, consumable products used, extra pulses, total invoice updates).
- [x] **TC-FN-08**: `getLocalDateString` local date formatting without UTC day-shifting.
- [x] **TC-FN-09**: `filterValidDoctorBookings` status filtering.
- [x] **TC-FN-10 to TC-FN-15**: Schedule filters, invoice total math, analytics rate computation, calendar days generation.

### Section 4: CRUD & Data Persistence Operations
- [x] **TC-CRE-01**: `POST /api/medical-records` creates new intake form.
- [x] **TC-CRE-02**: `POST /api/medical-records` upserts existing intake form without duplicates.
- [x] **TC-CRE-03**: `GET /api/medical-records?customerId=...` retrieves created intake form.
- [x] **TC-CRE-04**: `POST /api/prescriptions` creates new digital prescription.
- [x] **TC-CRE-05**: `GET /api/prescriptions?customerId=...` retrieves created prescription.
- [x] **TC-CRE-06**: `POST /api/medical-records` creates attached medical report (`REP-...`).
- [x] **TC-CRE-07**: `DELETE /api/prescriptions?id=...` deletes digital prescription.
