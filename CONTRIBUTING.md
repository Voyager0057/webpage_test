# Contributing

1. Create a focused branch for a feature, fix or documentation change.
2. Keep financial formulas in `backend/finance-core`; keep HTTP and persistence concerns in `finance-api`. UI components display API values instead of reimplementing formulas.
3. Add Chinese/English text together. Put shared visual changes in `frontend/src/styles/haven.css` and reusable shell components in `frontend/src/components/`.
4. Keep policy source URLs, dates and model limitations reviewable. Record a calculation example for a change to financial rules.
5. Run the checks appropriate to the change using `docs/TESTING.md`. A UI change needs production build, bilingual checks and relevant desktop/mobile browser journeys. Financial changes need unit and API integration coverage.
6. Describe the user-visible change, validation and limitations in the pull request. Have another member review the affected area.

Do not commit `.env`, `.runtime`, databases, logs, dependency caches, `node_modules`, `target`, `dist` or temporary exports. Use `.env.example` for configuration names. Include third-party notices whenever copying template material.

For group assessment, each member should be able to explain the work they submit and retain truthful review, testing and contribution records. Follow the course's AI-use disclosure rules.
