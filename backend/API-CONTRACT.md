# Homewise API — Ningbo profile

Engine **2.0.0**, policy **NB-2026.10-v2**. All routes start with `/api` and use JSON. Decimal money/rates are serialized as strings; numeric input is accepted. Invalid/unknown fields return HTTP 400 with `{error, details}`. A valid calculation can return `feasible: false` when modeled constraints fail.

## Read endpoints

| Method and path | Response |
| --- | --- |
| `GET /health` | `{status, engineVersion, database}`; checks database connectivity |
| `GET /examples` | Synthetic examples: `[{id, name, description, scenario}]` |
| `GET /policies` | Version, city, label, verification date, scope, assumptions, references, districts and rules; references include issuer, effective date and review status |

## Calculate

`POST /calculate` accepts a Scenario; omitted fields use synthetic defaults. `finance-core/.../Scenario.java` is the authoritative definition.

| Group | Fields and defaults |
| --- | --- |
| Scope | `city: NINGBO`, `district: YINZHOU`, `taxYear: 2026` |
| Income | `monthlySalary: 30000`, `monthlyPerformance: 0`, `monthlyAllowance: 0`, `annualBonus: 60000`, `bonusMonth: 12` |
| Bonus | `bonusTaxMode: AUTO` (AUTO/SEPARATE/COMBINED), `bonusEligible: true` |
| Social insurance | `socialInsuranceMode: CONFIRMED_AMOUNT` (or BASE_RATE), `confirmedMonthlySocial: 3150`; alternative `socialInsuranceBase: 30000`, pension/medical/unemployment employee rates 0.08/0.02/0.005 are user-confirmed assumptions |
| PF contributions | `pfBase: 30000`, `pfEmployeeRate: 0.07`, `pfEmployerRate: 0.07`, `confirmedPfBaseCeiling: 38907` (provisional June reference, not a verified latest cap) |
| PF eligibility | `pfBalance: 100000`, `pfLoanLimit: 1000000`, `pfEligible: true`, `firstHome: true`, `firstPfLoan: true`, `pfContributionMonths: 24`, `pfWithdrawalConfirmed: true` |
| Deductions | `mortgageDeduction: true`, `mortgageDeductionMonthsUsed: 0`, `otherMonthlyDeductions: 0`; mortgage tax eligibility is independent of PF first-home classification |
| Property/loan | `housePrice: 3000000`, `downPaymentRate: 0.30`, `loanYears: 30`, `confirmedMaxLoanYears: 30`, `pfLoanAmount: 1000000`, `commercialAnnualRate: 0.031`, `pfAnnualRate: 0.026` |
| Repayment | `repaymentMethod: ANNUITY` (or EQUAL_PRINCIPAL), `providentUsage: MONTHLY_OFFSET` (or NONE) |
| Budget/valuation | `monthlyLivingCost: 6000`, `minMonthlyCash: 1000`, `maxMonthlyPayment: 0` (no additional ceiling), `annualDiscountRate: 0.03`, `annualInflationRate: 0.02` |

Only 2026 and loan terms 1–30 years are supported. Nonzero PF rates must be equal and within 5–12%. Contribution bounds, declared eligibility, confirmed limits and budget constraints determine feasibility. The model also uses down-payment floors of 20% with a PF leg and 15% for a pure commercial loan; these are stated screening assumptions, not a certification of every current banking product. This is not a bank approval endpoint.

```sh
curl -H 'Content-Type: application/json' -d '{}' http://localhost:8080/api/calculate
```

Response fields:

- `input`: normalized scenario actually calculated, including PF reference-rate adaptation.
- `summary`: annual gross income, final tax, tax withheld, possible settlement refund, take-home cash, mortgage payments, PF withdrawals, cash after mortgage, disposable cash, minimum monthly cash, loan principals, down payment, ending PF balance, lifetime interest/repayment, present-value cost and inflation-adjusted payment cost.
- `monthly`: 12 records with income, contributions, cumulative taxable income, tax, take-home, mortgage payment, PF withdrawal (`pfOffset`), opening/closing PF balance, cash before/after living costs, remaining loan principal and mortgage deduction.
- `schedule`: full term. Each row includes `month, payment, principal, interest, remainingPrincipal, commercialPayment, commercialPrincipal, commercialInterest, commercialBalance, pfPayment, pfPrincipal, pfInterest, pfRemainingPrincipal`.
- `feasible, violations, warnings, assumptions, policyVersion, engineVersion` and `bonusComparison: {selectedMode, separateTax, combinedTax}`.

`annualTax` is final annual liability; `annualTakeHome` uses modeled withholding. A possible settlement refund is not assumed received. `annualCashAfterMortgage` is before living costs; `annualDisposableCash` and `minimumMonthlyCash` are after living costs. PF reimbursement relates to the preceding paid installment, capped by the preceding closing PF balance; month one has none.

`presentValueCost` discounts down payment and contractual payments. `realPaymentCost` applies inflation instead. They are financing costs, exclude property value and do not measure net wealth.

## Optimize

`POST /optimize`:

```json
{"scenario":{},"minYears":10,"maxYears":30,"yearStep":1,"pfStep":"200000","minPfAmount":"0","maxPfAmount":"1000000","methods":["ANNUITY","EQUAL_PRINCIPAL"],"objective":"CASH_FLOW"}
```

Objectives: CASH_FLOW maximizes first-year cash after mortgage; INTEREST minimizes lifetime interest; PRESENT_VALUE minimizes discounted financing payments. House price/down payment stay fixed. Candidates include grid points, endpoints, applicable Ningbo amount boundaries and the in-range original input. Standard PF rates 2.1%/2.6% adapt at the five-year boundary; custom rates stay fixed. Maximum 2,500 candidates.

Response: `{objective, status, baseline, plans, pareto, evaluatedCount, feasibleCount, rejectedCount, rejectionReasons, elapsedMs, searchDescription, searchSettings}`. Status is SUCCESS or NO_FEASIBLE. Up to three plans include `{rank, scenario, summary, score, explanations}`. Search settings record actual bounds, steps, methods and objective. Calculate a recommended scenario again for its full ledger. Pareto output presents cash/interest trade-offs, capped at 60 points. Optimality applies only to the candidate set.

## Compare saved scenarios

`POST /compare`:

```json
{"scenarios":[{"id":"base","name":"Original","scenario":{}},{"id":"alternative","name":"20-year loan","scenario":{"loanYears":20}}]}
```

Accepts 1–4 scenarios. Unique IDs and names must be nonblank and at most 80 characters. Returns `[{id, name, calculation}]`, independently recalculated. Requests are not persisted.

## Compare changed conditions

`POST /scenario-changes`; `/sensitivity` remains a compatibility alias:

```json
{"scenario":{},"parameter":"bonusShare","values":["0","0.05","0.10","0.15","0.20"]}
```

Supported parameters: commercialAnnualRate, monthlySalary, pfLoanAmount, loanYears, bonusShare. Accepts 1–15 values. Bonus share accepts 0–0.50 and preserves exact annual gross income while redistributing salary and bonus; contributions remain fixed. Terms must be whole years. Other comparisons keep remaining inputs fixed and do not rerun optimization.

Returns `{parameter, points, assumption}`; each point includes value, normalized scenario, feasibility, violations, income/tax/cash metrics and interest/valuation metrics.

## Hosting and persistence

Policy documents and synthetic examples are persisted. Personal scenarios are session-scoped in the browser, not saved in the database. Same-origin is the default; a separate frontend requires exact origin configuration through `HOMEWISE_ALLOWED_ORIGINS`. No authentication/account API is implemented.
