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
- The **admin panel (`/admin`) has no authentication** — do not assume it is protected.
- Many admin sections (Finance, Payroll, Prescriptions, Inventory, POS) are **mock UI only** — backed by hardcoded constant arrays, not Supabase. Do not treat them as real features.
- **Patient auth is non-functional** — the OTP flow is UI-only.
- **`branch` is the topmost scoping unit.** There is no org/tenant layer.
- The `translations.ts` file is the single source of truth for all UI copy (EN/AR). Do not hardcode strings in components.
- Brand colors are defined as CSS custom properties in `globals.css`. Use `var(--cr-primary)` and `var(--cr-accent)` — do not add new raw hex inline values.

## Fork-per-Client Context

If you are working on a fork for a new client (not Revera), see `PROPOSALS.md` for the
plan to centralize client-specific values. Do not start a fork without reading that file.
