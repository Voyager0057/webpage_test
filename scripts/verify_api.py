#!/usr/bin/env python3
"""Independent HTTP acceptance checks; stdlib only, no production engine imports."""
import json
import os
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
CLIENT = build_opener(ProxyHandler({}))
RESULTS = []


def call(route, body=None, expected_status=200):
    payload = None if body is None else json.dumps(body).encode()
    request = Request(
        BASE_URL + "/api/" + route,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with CLIENT.open(request, timeout=90) as response:
            status, raw = response.status, response.read()
    except HTTPError as error:
        status, raw = error.code, error.read()
    assert status == expected_status, (route, status, raw.decode()[:600])
    return json.loads(raw)


def check(name, assertion):
    assert assertion, name
    RESULTS.append(name)
    print("PASS", name)


def number(value):
    return Decimal(str(value))


check("Database-backed API health", call("health")["status"] == "UP")
policies = call("policies")
check("Versioned policy with traceable sources", bool(policies["version"]) and len(policies["references"]) >= 3)
check("Example scenarios available", len(call("examples")) >= 2)

baseline = call("calculate", {})
summary = baseline["summary"]
check("Default complete year and mortgage horizon", len(baseline["monthly"]) == 12 and len(baseline["schedule"]) == 360)
# Independent statutory bracket arithmetic:
# (30000 - 3150 - 2100 - 5000 - 1000)*12 = 225000;
# ordinary tax = 225000*20%-16920 = 28080;
# annual bonus separate tax = 60000*10%-210 = 5790.
check("Independent annual tax fixture: 33,870 yuan", number(summary["annualTax"]) == Decimal("33870.00"))
check("Independent salary fixture: 323,130 yuan", number(summary["annualTakeHome"]) == Decimal("323130.00"))
check("Annual bonus selection", baseline["bonusComparison"]["selectedMode"] == "SEPARATE")
check("Loan principal conservation", sum(number(row["principal"]) for row in baseline["schedule"]) == number(summary["totalLoan"]))
check("Final mortgage balance is exactly zero", number(baseline["schedule"][-1]["remainingPrincipal"]) == 0)
check("Repayment accounting", number(summary["totalRepayment"]) == number(summary["totalLoan"]) + number(summary["totalInterest"]))

previous_balance = number(baseline["input"]["pfBalance"])
for row in baseline["monthly"]:
    check(
        f"Month {row['month']}: cash and provident account conservation",
        number(row["cashAfterMortgage"]) == number(row["takeHome"]) - number(row["mortgagePayment"]) + number(row["pfOffset"])
        and number(row["disposableCash"]) == number(row["cashAfterMortgage"]) - number(row["livingCost"])
        and number(row["pfBalance"]) == previous_balance + number(row["employeePf"]) + number(row["employerPf"]) - number(row["pfOffset"]),
    )
    previous_balance = number(row["pfBalance"])

equal_principal = call("calculate", {"repaymentMethod": "EQUAL_PRINCIPAL"})
payments = [number(row["payment"]) for row in equal_principal["schedule"]]
check("Equal principal payments decrease", all(a >= b for a, b in zip(payments, payments[1:-1])))
check("Equal principal costs less interest at same terms", number(equal_principal["summary"]["totalInterest"]) < number(summary["totalInterest"]))
no_loan = call("calculate", {"downPaymentRate": "1", "pfLoanAmount": "0"})
check("Cash purchase carries no loan or mortgage deduction", number(no_loan["summary"]["totalInterest"]) == 0 and all(number(row["mortgageDeduction"]) == 0 for row in no_loan["monthly"]))
zero_rate = call("calculate", {"pfLoanAmount": "0", "commercialAnnualRate": "0"})
check("Zero interest loan retains all principal", number(zero_rate["summary"]["totalInterest"]) == 0 and number(zero_rate["summary"]["totalRepayment"]) == number(zero_rate["summary"]["totalLoan"]))

for objective in ["CASH_FLOW", "INTEREST", "PRESENT_VALUE"]:
    result = call("optimize", {
        "scenario": {},
        "minYears": 29,
        "maxYears": 30,
        "pfStep": "1000000",
        "objective": objective,
    })
    metric = {"CASH_FLOW": "annualCashAfterMortgage", "INTEREST": "totalInterest", "PRESENT_VALUE": "presentValueCost"}[objective]
    actual, original = number(result["plans"][0]["summary"][metric]), number(result["baseline"]["summary"][metric])
    check(f"{objective}: recommendation no worse than included baseline", actual >= original if objective == "CASH_FLOW" else actual <= original)
    check(f"{objective}: search count balances", result["evaluatedCount"] == result["feasibleCount"] + result["rejectedCount"])
    reproduced = call("calculate", result["plans"][0]["scenario"])
    check(f"{objective}: recommended plan is reproducible and feasible", reproduced["feasible"] and reproduced["summary"] == result["plans"][0]["summary"])

infeasible = call("optimize", {"scenario": {"minMonthlyCash": "1000000"}, "minYears": 30, "maxYears": 30})
check("No feasible plans is explicit", infeasible["status"] == "NO_FEASIBLE" and not infeasible["plans"])
points = call("sensitivity", {"scenario": {}, "parameter": "commercialAnnualRate", "values": ["0.02", "0.03", "0.04"]})["points"]
check("Increasing interest raises total mortgage interest", number(points[0]["totalInterest"]) < number(points[1]["totalInterest"]) < number(points[2]["totalInterest"]))
call("calculate", {"monthlySalary": "-1"}, expected_status=400)
check("Invalid financial input returns HTTP 400", True)
call("optimize", {"pfStep": "0"}, expected_status=400)
check("Zero search step rejected", True)
call("calculate", {"unknownInput": "ignored?"}, expected_status=400)
check("Unknown fields rejected", True)

check("Ningbo policy profile and ten districts", policies["city"] == "NINGBO" and len(policies["districts"]) == 10)
check("Default snapshot satisfies modeled constraints", baseline["feasible"])
check("Withdrawal reimburses preceding repayment", number(equal_principal["monthly"][1]["pfOffset"]) == number(equal_principal["schedule"][0]["payment"]))
check("Withdrawal starts after first paid installment", number(baseline["monthly"][0]["pfOffset"]) == 0)
comparison = call("compare", {"scenarios": [
    {"id": "a", "name": "Original", "scenario": {}},
    {"id": "b", "name": "Shorter", "scenario": {"loanYears": 20}}
]})
check("Two independently computed comparison snapshots", len(comparison) == 2 and len(comparison[1]["calculation"]["schedule"]) == 240)
structures = call("scenario-changes", {"parameter": "bonusShare", "values": ["0", "0.1", "0.2"]})["points"]
check("Salary structure comparison preserves annual gross", all(number(p["annualGrossIncome"]) == Decimal("420000") for p in structures))
check("Monthly payment constraint can exclude all candidates", call("optimize", {"scenario": {"maxMonthlyPayment": "100"}, "minYears": 30, "maxYears": 30})["status"] == "NO_FEASIBLE")
call("calculate", {"pfEmployeeRate": "0.12", "pfEmployerRate": "0.05"}, expected_status=400)
check("Unequal Ningbo PF rates rejected", True)

report = {
    "checkedAt": datetime.now(timezone.utc).isoformat(),
    "baseUrl": BASE_URL,
    "passed": len(RESULTS),
    "checks": RESULTS,
}
output = Path(__file__).resolve().parent.parent / ".runtime" / "api-verification.json"
output.parent.mkdir(exist_ok=True)
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"\n{len(RESULTS)} checks passed; report: {output}")
