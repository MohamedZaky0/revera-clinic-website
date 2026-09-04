# Behavior Rules
- Before making code changes, read `ai_docs/README.md` and relevant core docs.
- ALWAYS update `ai_docs/` whenever making code edits, database schema updates, or architectural/UI changes.
- NEVER push any changes to the Git repository until you have verified that the project builds successfully with `npm run build` and has no compiler or TypeScript errors.
- ALWAYS push changes ONLY to the `dev` branch (`git push origin dev`). Never push directly to `main`.
- Keep changes to the minimum required, reuse existing functions and components, and prioritize clean UX for non-technical users.
- EVERY new function, API route, or core feature created from now on MUST be added to the Admin Settings System Test Suite (/admin -> Settings -> System Test Suite) for automated diagnostic verification.

