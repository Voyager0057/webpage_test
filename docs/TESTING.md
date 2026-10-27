# Testing and acceptance

Run commands from the repository root. Use Java 21+, Maven 3.9+, Node 22.13+ and pnpm 11.25.0. Install frontend dependencies with `pnpm --dir frontend install --frozen-lockfile`.

| Layer | Command | Coverage / reports |
| --- | --- | --- |
| JUnit unit tests | `mvn -B -f backend/pom.xml test` | Tax boundaries, mortgage formulas, cash/account conservation, search constraints; `finance-core/target/surefire-reports/` |
| Spring Boot integration | `mvn -B -f backend/pom.xml verify` | Includes unit tests, real HTTP on a random port, H2/Flyway/JPA, JSON validation and optimization; `finance-api/target/failsafe-reports/` |
| PostgreSQL integration | Same `verify` command with Docker running | Testcontainers starts PostgreSQL 16 and checks migration and persistence. Without Docker, this test is explicitly skipped. |
| TypeScript and production assets | `pnpm --dir frontend build` | Type checks and Vite production build |
| Bilingual component tests | `pnpm --dir frontend test:i18n` | Translation keys across components, placeholders, amount messages and both server-rendered languages |
| Live translation coverage | `BASE_URL=http://localhost:8080 pnpm --dir frontend test:i18n` | Also checks messages from the real API |
| HTTP acceptance | `python3 scripts/verify_api.py` | Independent scenario and API checks; `.runtime/api-verification.json` |
| Browser journeys | `pnpm --dir frontend test:e2e` | Desktop Chromium and Pixel 7 emulation; `frontend/playwright-report/` and `frontend/test-results/` |

## Browser setup

Start the application on port 8080 before running browser or HTTP acceptance tests:

```bash
./scripts/start.sh
pnpm --dir frontend exec playwright install chromium
pnpm --dir frontend test:e2e
```

An installed Chrome can be used instead of downloading Chromium:

```bash
PLAYWRIGHT_CHROME_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  pnpm --dir frontend test:e2e
```

Browser journeys cover recalculation and stale results, optimization and applying a recommendation, four-plan comparison, fixed-annual-income bonus-share comparison and Ningbo policy review status, infeasible constraints, CSV/JSON downloads and JSON import. Template-specific checks cover removal of the residential illustration, drawer snapshot isolation, closing/focus restoration, print isolation and complete repayment CSV exports, Chinese/English switching without losing inputs, hash navigation/back/forward and refresh restoration of session snapshots, mobile menu dismissal with Escape and horizontal overflow. Tests use synthetic data in isolated browser sessions.

## Release checks

Before a public release, run `verify`, the production frontend build, live bilingual tests, independent HTTP acceptance and the full browser suite. Report skipped tests explicitly. Use synthetic financial inputs in local and CI runs.

| Acceptance flow | Expected behavior |
| --- | --- |
| Core calculation | Independent annual tax fixture is 33,870.00 yuan; annual salary take-home is 323,130.00 yuan; repaid principal equals the loan |
| Loan methods | Annuity and equal principal both reconcile; final balance is exactly zero |
| Optimization | Recommendations satisfy declared constraints; no feasible result is explicit; applying a recommendation reproduces its summary |
| Plan details | Correct snapshot opens without replacing draft inputs; close/Escape restores the original view; CSV contains every installment |
| Navigation and languages | Five routes, legacy repayment redirect, refresh/history, Chinese/English copy and mobile menu remain usable |
| Public deployment | Anonymous HTTPS access, reachable Java API, exact-origin CORS and working calculations on the actual public URL |

Public-origin acceptance must follow a successful deployment. See [deployment instructions](DEPLOYMENT.md); local browser results alone do not verify cloud hosting.

## CI and release evidence

`.github/workflows/ci.yml` builds and tests Java and React, starts the application, runs HTTP/bilingual/browser acceptance and uploads reports. GitHub-hosted Linux runners provide Docker for the PostgreSQL test. The CI configuration is not evidence of a successful remote run until a workflow actually runs.

Record actual results in `VALIDATION.md`. Do not count skipped PostgreSQL tests as passes or mobile emulation as Android/iOS device acceptance. The final course release still needs at least one real desktop OS and one real mobile OS recorded with their browser versions and completed tasks.

Latest local Ningbo result: 23 core JUnit tests, 7 HTTP/H2 tests, 48 independent HTTP checks, 5 bilingual checks and 14 desktop/mobile-emulation journeys passed. PostgreSQL Testcontainers is configured but skipped locally without Docker. See VALIDATION.md for evidence and remaining device/hosting checks.
