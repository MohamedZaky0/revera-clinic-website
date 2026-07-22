# Behavior Rules
- Before making code changes, read `ai_docs/README.md` and every core document it lists; also read task-specific AI documentation when applicable.
- Keep `ai_docs/` accurate whenever a change affects documented architecture, database schema, API contracts, business rules, decisions, risks, or project status.
- After every completed change, run the relevant validation, then commit and push the changes. NEVER push any changes until you have verified that the project builds successfully with `npm run build` and has no compiler errors.
- Keep changes to the minimum required, reuse existing functions and components instead of duplicating them, and prioritize simple UX for non-technical users.
