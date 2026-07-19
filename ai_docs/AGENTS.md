# AGENTS.md — AI Agent Instructions for Revera Clinics

> **Last Updated:** 2026-06-26

## Read First

Before making any code changes:

1. Read `PROJECT.md` — understand what this system is and who it serves.
2. Read `ARCHITECTURE.md` — understand the tech stack and file structure.
3. Read `PRODUCT_RULES.md` — understand what business logic is actually enforced in code.
4. Read `DECISIONS.md` — understand what decisions have already been made and why.
5. Read `RISKS.md` — understand known risks before making changes that touch hardcoded values.

## Key Facts to Keep in Mind

- This is a **single-tenant** clinic management system for Revera Clinics only.
- The **admin panel (`/admin`) has full authentication and RBAC permissions** — session verification is enforced on mount.
- Core admin sections (Payroll, Prescriptions, Leaves, Performance, Attendance, Targets) are fully backed by Supabase tables and schemas.
- **Patient auth is non-functional** — the OTP flow is UI-only.
- **`branch` is the topmost scoping unit.** There is no org/tenant layer.
- The `translations.ts` file is the translation helper for UI copy (EN/AR).
- Brand colors are defined as CSS custom properties.

