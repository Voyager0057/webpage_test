# Public deployment and local operation

Repository: https://github.com/Voyager0057/webpage_test. Visitors to a published application do not need a GitHub or Render account. A platform account is required only for the project owner configuring hosting.

## Deployment architecture

| Option | Public website | Calculation runtime | Configuration |
| --- | --- | --- | --- |
| Complete application on one host | HTTPS URL assigned by Render or another Docker host | Java 21 / Spring Boot in the same container | Root `Dockerfile` and optional `render.yaml` |
| GitHub Pages with Java API | `https://voyager0057.github.io/webpage_test/` after successful Pages deployment | A separately deployed public HTTPS Java service | `.github/workflows/pages.yml` and repository variable `PUBLIC_API_URL` |
| Local review | `http://localhost:8080/` | Local Spring Boot | `scripts/start.sh` |

GitHub Pages serves static assets and cannot execute Java or PostgreSQL. Do not point a public frontend at `localhost` or describe an unconnected UI as a fully working deployment.

## Optional Render deployment

The repository includes a free web-service blueprint. It does not create a paid database or disk. The Docker image contains the React application and Java backend, so the service's own URL supports every page without CORS configuration.

1. Open [Deploy this repository on Render](https://render.com/deploy?repo=https://github.com/Voyager0057/webpage_test).
2. The project owner signs in and reviews the service configuration. Complete any account or GitHub authorization in the platform's own interface.
3. Confirm **Free** before creating the service. If that option is unavailable, stop and choose another host; the configuration does not authorize paid resources.
4. Wait for the Docker build and `/api/health` check to succeed. Copy the actual HTTPS service URL from Render. Service names can receive suffixes; do not assume a URL from the blueprint name.
5. Open the service URL and check calculation, optimization, plan comparison, details/export and both languages.

This demo uses in-memory H2, seeded from version-controlled policy/example resources on every start. It stores no user salary or mortgage inputs server-side. Browser session state and exports behave as in the local version. Use the existing PostgreSQL profile and an independently configured persistent database when persistence is required.

Free Render services sleep after idle periods and may take about a minute to wake. Their filesystem is ephemeral; the blueprint deliberately does not depend on local database persistence. No paid service is required by this blueprint. See [Render free-service limits](https://render.com/docs/free) and [Blueprint specification](https://render.com/docs/blueprint-spec).

## GitHub Pages setup

Once the public API works:

1. Set `PUBLIC_API_URL` in repository **Settings → Secrets and variables → Actions → Variables** to its HTTPS origin, with no `/api` suffix or trailing slash. This is a public URL, not a secret.
2. On the API, allow only `https://voyager0057.github.io` through `HOMEWISE_ALLOWED_ORIGINS`. The Render blueprint includes this exact origin.
3. Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
4. Run **Publish frontend to GitHub Pages**. The workflow verifies API health and CORS before publishing and sets the repository base path during the build. It refuses to publish without a working API URL.
5. Open the successful deployment's returned URL, then run the public smoke checks below. Do not infer deployment success from a green source-upload command.

The workflow also runs after successful CI on `main` once `PUBLIC_API_URL` is configured. Hash routes support direct links and refresh without server rewrite rules. A custom domain requires updating the Vite base path and exact allowed origin together.

## Public acceptance

Use a clean/private browser session and a second device where possible:

- Load all five pages through the HTTPS URL without signing in.
- Load a synthetic example, calculate and verify that the API reports connected.
- Search feasible plans, inspect a recommendation without replacing current inputs, compare plans and apply a recommendation.
- Open all three plan-detail tabs, export a full CSV and round-trip JSON input.
- Switch Chinese/English and check mobile navigation and horizontal scrolling within tables.
- Confirm API health, CORS preflight from the Pages origin and absence of browser mixed-content errors.

Record the real URLs, commit, Actions run URLs and checks in `VALIDATION.md`. A screenshot is not a substitute for a successful calculation against the published API.

## One-address local preview

Build using the root README, then run `./scripts/start.sh` or `./scripts/run.sh`. Open http://localhost:8080/#/calculator. Foreground mode keeps logs in the terminal; Ctrl+C stops it. Shutdown waits for the JVM and database to close before a restart replaces the runtime JAR. Background logs/PID are in `.runtime`; `./scripts/stop.sh` stops the recorded app.

For a phone on the same trusted network, use the computer's LAN address. A Windows foreground launcher is in `scripts/start.ps1`. Physical-device acceptance is recorded separately from emulation.

## Docker and PostgreSQL

```sh
cp .env.example .env
# Set a database password in .env.
docker compose up --build -d
docker compose logs -f app
docker compose down
```

PostgreSQL stays on the internal Compose network with a persistent volume. `down` preserves that volume. Do not commit `.env`, databases or credentials. Public hosts should provide HTTPS and platform request limits for anonymous calculation endpoints.

## Updates and rollback

Use feature branches and review changes before merging to `main`. CI validates financial calculations, HTTP integration, translations and browser journeys. Deploy the Java service and compatible frontend together when API contracts change. For rollback, redeploy a previously validated commit on the service host and rerun Pages from the matching source; keep the API URL unchanged if the service origin is unchanged.
