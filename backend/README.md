# Java calculation service

`finance-core` is independent Java 21 code using BigDecimal for salary/tax, contributions, cash ledgers, amortization and bounded optimization. `finance-api` supplies Spring Boot REST, Jackson, Flyway/JPA and policy/example persistence. See [API contract](API-CONTRACT.md).

```sh
mvn -B -f backend/pom.xml verify
./scripts/run.sh
```

Run from the repository root. Artifact: `finance-api/target/finance-api-1.0.0.jar`; engine version **2.0.0** and policy **NB-2026.10-v2** are separate from the artifact version. H2 is the local default; the postgres profile uses PostgreSQL. Root scripts serve frontend and API on one address.

## Scope and arithmetic

- Ningbo ordinary first-home, single borrower, one employer, 2026 scenario; district-specific PF contribution floors. Equal employer/employee PF rates of 5–12%, or zero for no contribution. Each side rounds to whole yuan.
- Social insurance uses a confirmed monthly amount or confirmed base/rates. PF ceiling 38,907 is an editable provisional June reference, not the verified latest ceiling.
- Ordinary PF limit: first-home first-PF-loan 1.6 million yuan, other ordinary limit 1.3 million; bounded additionally by the user's confirmed limit and 25 times balance with a 250,000 floor. Six contribution months and declared eligibility are checked. Special increases and co-borrowers are outside scope.
- PF withdrawal reimburses the preceding month's payment, capped by its closing account balance. Month one has no withdrawal. Current contributions become available next month; withdrawal procedures must be confirmed.
- Tax uses cumulative withholding. Final annual liability and possible settlement refund are separate; a refund is not anticipated as cash. Only eligible annual bonuses can use separate taxation. Mortgage-interest deduction eligibility is independent of PF classification and limited to 240 months.
- Loan legs share term/method. Terms 1–30 years describe software support, not all bank products. Rates are fixed; standard PF rates adapt at the five-year boundary.
- Cash projection covers one year; amortization covers the full term. Financing present value includes down payment and contractual payments on a common 360-month horizon. Inflation is an alternative adjustment.

Credit, actual approvals, property age and real accounts are not queried. Feasible means only modeled constraints passed. Out-of-bound contribution inputs can produce an explanatory ledger but are excluded from recommendations. Real salary inputs are not automatically persisted.

## Verification and maintenance

Maven test runs JUnit; verify adds real HTTP/H2 integration and PostgreSQL Testcontainers if Docker is available. Missing Docker explicitly skips that test. Coverage includes independent tax fixtures, contribution boundaries, principal/cash conservation, withdrawal timing, constrained search, fixed-income salary redistribution and API validation/CORS. See [actual validation](../VALIDATION.md).

The versioned JSON in ../policies is packaged as a resource and seeded under its version ID and current. Update source evidence, core constants, translations and tests together. Unsupported future tax years are rejected instead of silently reusing this profile.
