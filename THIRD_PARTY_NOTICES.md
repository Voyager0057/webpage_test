# Third-party notices

## Haven real estate template

The Homewise presentation layer adapts the design tokens, header, hero composition and house illustration from **Haven**, supplied in `real-estate.zip`.

- Author: Novpix LLC / ZumaTools
- Copyright: 2026 Novpix LLC (ZumaTools)
- License: MIT
- Full license: [`third_party/haven/LICENSE`](third_party/haven/LICENSE)
- Template metadata: [`third_party/haven/template.json`](third_party/haven/template.json)
- Used asset: `frontend/public/templates/haven/house-modern.svg`
- Adapted styles: `frontend/src/styles/haven.css`
- The asset license is also included in the deployed frontend at `templates/haven/LICENSE.txt`.

The original property listings, agents, lead forms and US mortgage estimates are not included. Homewise uses its existing Java calculation engine and Chinese policy model. All displayed property amounts come from the current scenario; the illustration is labeled as illustrative.

Font stacks follow the template's serif/sans-serif pairing and fall back to installed system fonts. No remote font request is required. No font binaries are redistributed.

## Dependencies

Frontend and Java dependencies retain their respective upstream licenses. Exact frontend versions are recorded in `frontend/pnpm-lock.yaml`; Java dependency versions are managed by `backend/pom.xml` and Spring Boot's dependency management. The Haven MIT license applies to the supplied template material; it does not assign a license to the entire student project.
