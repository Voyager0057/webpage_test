# Haven template adaptation

## Scope

Adopt the user-supplied Haven appearance while retaining Homewise content, calculations and workflows. The stack remains React/TypeScript, Ant Design, ECharts, Spring Boot, Java/BigDecimal and H2/PostgreSQL.

## What changed

- Evergreen `#1f4d45`, brass `#c8a15a` and warm white `#f7f6f2` tokens.
- A responsive top navigation replaces the sidebar. Mobile navigation supports labeled controls, expanded state, Escape dismissal and focus restoration.
- A serif headline, illustrated home and scenario-derived property/loan figures adapt the Haven hero.
- Rounded cards, form surfaces, buttons and footer use the new theme.
- Local asset and license URLs follow Vite's base URL.
- Unit and integration tests are separated using Maven Surefire and Failsafe.

## Preserved behavior

Income, bonus, deductions, provident fund, combined mortgages, both repayment methods, monthly cash flow, full loan schedules, bounded optimization, comparisons, policy explanations, project content, Chinese/English switching and CSV/JSON workflows use the existing application contracts. No financial formulas were imported from the template. Language uses local storage; the five-page financial workspace with a shared plan-details window uses session storage and has an explicit clear action. The Ningbo extension provides independent ledgers, saved comparison snapshots and policy review status.

## Source and licensing

The user supplied `real-estate.zip` containing Haven by Novpix LLC / ZumaTools under MIT. The original template is plain HTML/CSS/JavaScript; its presentation was adapted into React. See `THIRD_PARTY_NOTICES.md` and `third_party/haven/LICENSE`. The residential illustration and its reserved layout were removed from the calculator homepage at the user’s request. The compact heading retains the template typography, colors and input/output styling; original licensed assets remain in the repository for attribution.

## Local review and later upload

Preview at `http://localhost:8080/`. This change is prepared for review locally. Upload to `Voyager0057/webpage_test` is a later action after the user's review. GitHub Pages can serve a frontend bundle; the complete Java application requires a backend runtime. A manual Pages workflow is provided for future use with a separately hosted HTTPS API. It has not been run.
