# Homewise web client

React 19, TypeScript, Vite, Ant Design and ECharts. Haven provides the retained colors, typography and layout. Authoritative arithmetic runs in Java.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

Vite serves port 5173 and proxies /api to 8080. Root startup scripts serve the built frontend and API together on 8080. Optional build variables are in .env.example.

## Five connected pages

| Route | Purpose |
| --- | --- |
| #/calculator | Salary composition, Ningbo contributions, mortgage, constraints, results and JSON import/export |
| #/optimization | Search ranges, methods, objectives, recommendations, rejections and actual settings |
| #/comparison | Up to four named plans, metric differences and CSV; controlled changes including fixed-income bonus share |
| #/policies | Policy version, sources/review status, formulas, scope and assumptions |
| #/help | Linked guide, examples, FAQ, six-member roles, stages and clear-workspace action |

The calculator, recommendation cards and saved comparison plans open **View plan details** in a shared right-hand drawer (full-width on mobile). It contains Income & Tax, Cash Flow & Provident Fund, and Repayment Schedule tabs, with CSV export and print/PDF. Closing it restores the originating page without applying the selected plan to the draft. The help guide can also open the current calculation. Legacy `#/repayment` links redirect to the calculator.

navigation.ts implements hash routes, browser history and session state. Hash URLs work on static hosts without rewrite rules. App.tsx coordinates scenarios/results; pages/ holds comparison and help; components/PlanDetailsDrawer.tsx contains the shared plan-details window. AppShell provides responsive navigation and language control.

## Financial state

Drafts, calculations, searches and comparisons use sessionStorage under homewise.v2.*. Refresh restores the same tab's workspace. Use Clear workspace on the help page on shared computers. Exports are explicit local downloads. The backend does not store salary/loan input. Only locale uses localStorage.

Edits mark old results stale. Recommendations and saved plans retain independent snapshots. Viewing their ledger preserves the current draft; applying one changes the draft. Async responses cannot overwrite newer input.

Amounts cross the API as decimal strings; chart conversions are display-only. JSON format is homewise-scenario-v2. Imported inputs are validated and recalculated by Java. CSV exports all rows in the selected ledger, including all loan installments. Print/PDF prints the displayed view and current table page; use CSV for the complete schedule.

## Translation and testing

en.json covers UI text; backend-en.json covers policy, validation and results. i18n.tsx handles locale and interpolation without changing inputs. Official links retain original destinations; fonts use local system fallbacks.

```sh
pnpm test:i18n
BASE_URL=http://localhost:8080 pnpm test:i18n
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests run desktop Chromium and Pixel 7 emulation. PLAYWRIGHT_CHROME_EXECUTABLE selects installed Chrome. Physical device acceptance is separate. See [testing](../docs/TESTING.md) and [validation](../VALIDATION.md).

Haven attribution is retained in public/templates/haven and third_party/haven. Original template scripts and US mortgage formulas are not executed.
