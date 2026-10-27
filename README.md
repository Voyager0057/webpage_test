# Homewise / 衡居

A bilingual mortgage and personal income tax web application for **GRP P01**. Combine salary, income tax, housing provident fund and mortgage payments in one cash-flow model, then compare feasible loan plans.

The frontend adapts the user-supplied **Haven** real estate template. Homewise retains its original financial workflows and Java calculation engine.

[![Verify Homewise](https://github.com/Voyager0057/webpage_test/actions/workflows/ci.yml/badge.svg)](https://github.com/Voyager0057/webpage_test/actions/workflows/ci.yml)

**Source repository:** [Voyager0057/webpage_test](https://github.com/Voyager0057/webpage_test). See [deployment instructions](docs/DEPLOYMENT.md) for the public website configuration and [testing](docs/TESTING.md) for reproducible checks. A public application URL must only be described as live after its deployment has succeeded; the repository upload does not run the Java server.

![Homewise desktop preview](artifacts/screenshots/calculator-compact-home.png)

## Run locally / 本地启动

After the first build:

```bash
./scripts/start.sh
```

Open **http://localhost:8080/**. The top-right **中文 / EN** buttons switch the interface language.

```bash
./scripts/stop.sh  # stop the app
./scripts/run.sh   # run in this terminal; Ctrl+C stops it
```

Background logs are written to `.runtime/app.log`. The default local database is H2; Docker and a database installation are not needed for local review. Personal financial inputs and result snapshots are retained in this browser tab’s session storage, so refresh restores the workspace. They are not automatically saved to the database. Use the help page to clear the workspace.

## First build

Prerequisites: **JDK 21+**, **Node.js 22.13+**, **pnpm 11.25.0**. Maven 3.9+ is recommended; the bootstrap script installs a project-local Maven 3.9.9 if needed. The build requires dependency download access.

macOS / Linux:

```bash
npm install --global pnpm@11.25.0
./scripts/bootstrap.sh
./scripts/build.sh
./scripts/start.sh
```

Windows PowerShell (install Maven as well):

```powershell
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
mvn -B -f backend/pom.xml verify
powershell -ExecutionPolicy Bypass -File scripts/start.ps1
```

For another port: `PORT=8081 ./scripts/start.sh`, or `$env:PORT="8081"` in PowerShell. A phone on the same trusted network can open `http://<computer-LAN-IP>:8080` if the firewall permits it. `localhost` on a phone refers to that phone, not your computer.

## Features

- Salary, performance pay, taxable allowances, annual bonus, social insurance, provident-fund contributions and eligible deductions.
- Annual tax and monthly withholding, with separate/combined bonus tax comparison.
- Commercial, provident-fund and combined mortgages; equal payment and equal principal repayment.
- Monthly cash-flow ledger, full repayment schedule, interest, discounted financing cost and inflation-adjusted payment cost.
- Bounded search over loan terms, loan mix and repayment methods under user constraints; comparison with the original plan and applying recommendations.
- Up to four saved comparison plans, controlled condition changes and fixed-annual-income bonus-share comparison.
- Versioned Ningbo sources, review status, formulas, examples and model explanations.
- Chinese/English interface, responsive navigation, JSON import/export and CSV ledger export.

The current calculator uses a **2026 Ningbo ordinary first-home, single-borrower scenario** and fixed-rate assumptions. It is a scenario model rather than a bank approval service. Policy scope, eligibility limits and calculation assumptions are documented in [Policy research](docs/POLICY_RESEARCH.md) and the [backend guide](backend/README.md).

## Connected pages

| Page | URL | Main tasks |
| --- | --- | --- |
| Joint calculator | `#/calculator` | Enter income, contributions, property/loan and budget; calculate and import/export |
| Plan optimization | `#/optimization` | Search terms, PF mix and repayment methods; inspect, compare or apply a recommendation |
| Conditions and plans | `#/comparison` | Compare up to four snapshots; compare salary structure, rates, terms and loan mix |
| Policies and methods | `#/policies` | Read sources, review status, formulas, assumptions and scope |
| Help and project | `#/help` | Follow the guide, load examples, view team roles/stages and clear session data |

The calculator, recommendation cards and saved comparison plans open **View plan details** in a shared right-hand drawer (full-width on mobile). It contains Income & Tax, Cash Flow & Provident Fund, and Repayment Schedule tabs, with CSV export and print/PDF. Closing it restores the originating page without applying the selected plan to the draft. The help guide can also open the current calculation. Legacy `#/repayment` links redirect to the calculator.

Navigation, browser back/forward, direct links and refresh are supported. Recommendation and comparison ledgers retain independent snapshots. The interface uses formal Chinese/English text. The provisional PF contribution ceiling and user-confirmed social insurance/credit limits are labeled explicitly; the model does not claim complete current bank-approval coverage.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| UI | Ant Design, Apache ECharts, Haven-derived CSS |
| Backend | Java 21 target, Spring Boot 3.5.7, REST/JSON |
| Calculation | Independent `finance-core` module, `BigDecimal` |
| Persistence | H2 locally; PostgreSQL 16 with Docker Compose; JPA/Hibernate and Flyway |
| Tests | JUnit 5, Spring Boot HTTP integration, Testcontainers, Playwright and Node test runner |
| Delivery | Maven, pnpm, Docker, GitHub Actions |

## Repository layout

```text
frontend/
  src/components/       Navigation, compact heading, plan-details drawer and charts
  src/pages/            Comparison and help pages
  src/navigation.ts     Hash routes and session workspace
  src/styles/           Haven theme and responsive presentation
  src/locales/          English UI and backend-message translations
  src/App.tsx           Financial pages and scenario state
  public/templates/     Retained licensed template assets and notice
  tests/                Browser journeys and bilingual tests
backend/
  finance-core/         Financial models, calculations and JUnit unit tests
  finance-api/          Spring Boot API, persistence and integration tests
  API-CONTRACT.md       Request and response contract
policies/               Policy source registry
docs/                   Requirements, architecture, testing and team plans
scripts/                Build, start, stop and verification commands
third_party/haven/      Template metadata and original MIT license
artifacts/screenshots/  Selected UI review images
experiments/            Historical synthetic validation scripts and outputs
.github/workflows/      CI and public frontend publication workflows
compose.yaml            Application and PostgreSQL deployment
Dockerfile              Frontend + Java multi-stage image
render.yaml             Optional free full-stack web service blueprint
```

`.runtime/`, `.tools/`, installed dependencies, build products, temporary document exports and unrelated local demos are excluded from Git. See [Contributing](CONTRIBUTING.md) for boundaries and review expectations.

## Development

Backend:

```bash
mvn -f backend/pom.xml install -DskipTests
mvn -f backend/finance-api/pom.xml spring-boot:run
```

Frontend with hot reload:

```bash
pnpm --dir frontend dev
```

Vite uses **http://localhost:5173** and proxies `/api` to port 8080. The ordinary built application uses only port 8080. The browser always delegates authoritative tax and mortgage arithmetic to Java.

## Testing

```bash
mvn -B -f backend/pom.xml test       # JUnit unit tests
mvn -B -f backend/pom.xml verify     # unit + HTTP/database integration tests
pnpm --dir frontend build
pnpm --dir frontend test:i18n
./scripts/start.sh
python3 scripts/verify_api.py
BASE_URL=http://localhost:8080 pnpm --dir frontend test:i18n
pnpm --dir frontend exec playwright install chromium
pnpm --dir frontend test:e2e
```

PostgreSQL Testcontainers requires Docker; without it that test is reported as **skipped**. Browser tests cover desktop and mobile emulation; real mobile OS acceptance is a separate check. See [Testing](docs/TESTING.md) for coverage and report paths, and [Validation](VALIDATION.md) for actual results and limitations.

## Docker / PostgreSQL

```bash
cp .env.example .env
# Set DB_PASSWORD in .env, then:
docker compose up --build -d
```

Visit **http://localhost:8080/**. The database is in a persistent Docker volume and is not exposed directly to the host. Use `docker compose logs -f app` to inspect logs and `docker compose down` to stop while preserving the volume.

GitHub Actions builds and tests Java and React and retains validation reports. **GitHub Pages hosts the frontend; a public HTTPS Spring Boot service supplies calculations.** The optional `render.yaml` deploys the full application as one free web service with seeded in-memory H2, so personal financial inputs remain in each visitor's browser session. PostgreSQL remains available through Docker Compose for persistent deployments.

To keep the current Java architecture, deploy that web service, set its HTTPS URL as the GitHub repository variable `PUBLIC_API_URL`, and run **Publish frontend to GitHub Pages**. Neither site requires visitor sign-in. The free Render service can sleep when idle and its demo database is recreated on restart. See [deployment](docs/DEPLOYMENT.md) for setup, verification and rollback.

## Documentation and attribution

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment options](docs/DEPLOYMENT.md)
- [Six-member delivery plan](docs/GRP_TEAM_AND_DELIVERY_PLAN_EN.md)
- [Requirements and acceptance](docs/REQUIREMENTS.md)
- [API contract](backend/API-CONTRACT.md)
- [Frontend guide](frontend/README.md)
- [Template adaptation](docs/TEMPLATE_ADAPTATION.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Haven design and illustration: © 2026 Novpix LLC (ZumaTools), MIT. The complete notice is preserved in `third_party/haven/LICENSE` and distributed with the frontend. The template's demonstration listings and US mortgage formulas are not used by Homewise.
