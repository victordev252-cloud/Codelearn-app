# Project TODO

- [x] Premium public landing page with hero, feature highlights, track preview, and sign-up CTA
- [x] Responsive navigation with landing, courses, dashboard, projects, and certificate entry points
- [x] Manus authentication flow with sign-in, protected learner experience, and logout
- [x] Structured HTML, CSS, and JavaScript course catalog with track metadata and lesson cards
- [x] Rich lesson viewer with objectives, explanations, code snippets, examples, best practices, and navigation
- [x] Lesson completion tracking with progress persistence
- [x] Interactive multiple-choice quizzes with instant answer feedback and score persistence
- [x] In-browser HTML/CSS/JavaScript sandbox with tabs, live preview, run, reset, copy, and download actions
- [x] Learner progress dashboard with completed lessons, quiz scores, streak-style metrics, and per-track progress
- [x] Project challenges section with requirements, difficulty, progress state, and submission tracking
- [x] Certificate page gated by full course-track completion with printable certificate presentation
- [x] Context-aware AI tutor chat inside lessons using the current lesson content and learner question
- [x] Database schema and server procedures for tracks, lessons, progress, quizzes, projects, submissions, and certificates
- [x] Vitest coverage for core procedures and completion/certificate gating logic
- [x] Responsive visual verification at desktop and mobile breakpoints
- [x] Build, type-check, and test validation
- [ ] Sync completed implementation into victordev252-cloud/Codelearn-app and push to GitHub

## Review follow-ups

- [x] Protect learner-only screens and add a working logout control in the UI
- [x] Hydrate lesson completion and quiz scores from backend progress on startup
- [x] Fix sandbox preview to reflect edited HTML/CSS/JavaScript and add Run and Download actions
- [x] Replace hardcoded dashboard metrics with backend-driven progress and quiz aggregates
- [x] Add visible project requirements and read/write submission state in the UI
- [x] Enforce certificate eligibility from actual track lesson completion on the server
- [x] Add server-backed curriculum entities or document the intentionally static curriculum boundary (canonical curriculum is intentionally kept in shared/curriculum.ts; mutable learner data is database-backed)

## Final hardening follow-ups

- [x] Add broader Vitest coverage for progress save/load, submissions read/write, and certificate issuance success path
- [x] Capture and review screenshots for lesson, dashboard, projects, certificate, and protected-gate views at desktop and mobile breakpoints
- [x] Hydrate persisted quiz scores into lesson-level state on startup and display the saved score
- [x] Replace or compute streak metrics from persisted learning activity instead of hardcoded values
- [x] Refetch or optimistically update project submissions after mutations so status changes are immediately visible
- [x] Create an architecture note documenting the intentional static curriculum and database-backed learner data boundary

## Delivery verification follow-ups

- [x] Add Vitest coverage for progress save, project submission writes, and successful certificate issuance after complete track progress
- [x] Capture mobile screenshots for lesson, dashboard, projects, certificate, and protected-gate screens and re-run the catalog capture
