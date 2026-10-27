# Architecture

Homewise combines a React client with a modular Java backend:

```text
Five React / TypeScript pages + shared plan-details drawer
  navigation + session workspace + bilingual presentation
                  |
           REST /api JSON
                  |
Spring Boot finance-api -- JPA / Flyway -- H2 or PostgreSQL
                  |
finance-core / BigDecimal
  tax + salary + Ningbo contributions + loans + cash + search
```

## Frontend boundaries

| Location | Responsibility |
| --- | --- |
| src/App.tsx | Shared scenario/result snapshots; calculator, optimization and policy pages; request coordination |
| src/components/PlanDetailsDrawer.tsx | Income/tax, full amortization and PF cash ledgers; snapshot viewing and CSV/print |
| src/pages/ComparisonPage.tsx | Four saved plans and controlled condition comparison |
| src/pages/HelpPage.tsx | Guide, examples, FAQ, team information, stages and workspace reset |
| src/navigation.ts | Five hash URLs, back/forward and session storage |
| src/components/AppShell.tsx | Responsive Haven navigation, keyboard focus, locale, status and footer |
| src/components/ScenarioHero.tsx | Compact calculator heading, actions and scenario figures |
| src/components/Chart.tsx | ECharts lifecycle, resize and disposal |
| src/api.ts / types.ts | Transport, downloads, contracts and synthetic defaults |
| src/i18n.tsx / locales | Chinese/English display text; locale alone uses local storage |
| src/styles/haven.css | Template tokens, responsive layouts and print rules |

The five routes are calculator, optimization, comparison, policies and help. Cash flow and repayment are tabs in a shared plan-details drawer, with independent snapshots. The drawer does not change the route or current draft. Legacy repayment URLs redirect to the calculator. Navigation links, action buttons and policy anchors connect them. A recommendation can be inspected, compared or applied without silently replacing another saved snapshot.

Drafts/results/search settings are session-scoped; refresh restores them. Editing marks prior results stale. Calculation responses cannot overwrite newer input. Definitive money arithmetic remains in Java; numeric chart conversion is display-only.

## Backend boundaries

- finance-core has no Spring/database dependency. Scenario validates input; NingboPolicy holds modeled limits; TaxCalculator, MortgageCalculator and FinanceEngine produce immutable output records; Optimizer searches bounded candidates.
- finance-api exposes calculation, optimization, saved-plan comparison, condition comparison, policy, examples and health. Unknown JSON fields are rejected.
- Policies are versioned JSON resources packaged into the JAR. PolicySeed stores versioned/current documents and synthetic examples using Flyway/JPA.
- Salary and loan requests are not automatically persisted. H2 enables local review without Docker; the postgres profile supports PostgreSQL.
- Local scripts serve frontend/dist and /api on port 8080. Vite dev uses 5173 with an API proxy.
- Docker packages the frontend into the Spring Boot artifact. Optional exact-origin CORS supports a separately hosted static frontend.

## State flow

```text
Input draft -> calculate -> current snapshot -> ledger / comparison
     |                           |
     +-> optimize -> recommended snapshots -> inspect / compare / apply
     +-> changed conditions -> independent points -> save to comparison
```

JSON exports retain inputs, calculation and versions; imports recalculate validated inputs. CSV exports the selected complete dataset. Print renders the current view. No account system or remote personal-data persistence is implied.

## Repository boundaries

frontend/backend contain source and tests; policies/docs contain evidence and design; scripts contains reproducible commands; third_party preserves notices; artifacts/screenshots holds reviewed images. Runtime databases, logs, dependencies, secrets and build outputs are ignored. Existing experiments contains historical synthetic validation artifacts, not evidence for the new Ningbo profile unless regenerated and reviewed.
