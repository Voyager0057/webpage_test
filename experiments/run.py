#!/usr/bin/env python3
"""Reproduce the GRP pilot comparison against the running Java HTTP API."""
import csv
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import ProxyHandler, Request, build_opener

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
CLIENT = build_opener(ProxyHandler({}))
OUT = Path(__file__).resolve().parent


def post(route, body):
    request = Request(
        BASE_URL + "/api/" + route,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with CLIENT.open(request, timeout=120) as response:
        return json.load(response)


cases = [
    ("baseline", "基准：组合贷30年、等额本息、月冲", {}),
    ("commercial_only", "全部商贷", {"pfLoanAmount": "0"}),
    ("equal_principal", "等额本金", {"repaymentMethod": "EQUAL_PRINCIPAL"}),
    ("twenty_years", "缩短至20年", {"loanYears": 20}),
    ("no_pf_offset", "不使用公积金月冲", {"providentUsage": "NONE"}),
    ("bonus_combined", "奖金并入综合所得", {"bonusTaxMode": "COMBINED"}),
    ("salary_15000", "工资15000、相同房价", {
        "monthlySalary": "15000", "socialInsuranceBase": "15000",
        "pfBase": "15000", "annualBonus": "30000",
    }),
    ("salary_50000", "工资50000、缴费基数按上限", {
        "monthlySalary": "50000", "socialInsuranceBase": "37731",
        "pfBase": "37731", "annualBonus": "100000",
    }),
]
records = []
for key, label, scenario in cases:
    result = post("calculate", scenario)
    records.append({
        "id": key, "label": label, "scenario": result["input"],
        "feasible": result["feasible"], "violations": result["violations"],
        "summary": result["summary"], "engineVersion": result["engineVersion"],
        "policyVersion": result["policyVersion"],
    })
    print(key, "feasible=" + str(result["feasible"]), "annualCash=" + result["summary"]["annualDisposableCash"])

optimizations = {}
for objective in ["CASH_FLOW", "INTEREST", "PRESENT_VALUE"]:
    optimizations[objective] = post("optimize", {
        "scenario": {}, "objective": objective, "minYears": 10,
        "maxYears": 30, "yearStep": 1, "pfStep": "200000",
    })
    print(objective, optimizations[objective]["evaluatedCount"], "candidates")
sensitivity = post("sensitivity", {"scenario": {}, "parameter": "commercialAnnualRate"})
payload = {
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "method": "Pilot synthetic scenarios, Java HTTP API, fixed policies and rates; no real household data.",
    "scenarios": records, "optimizations": optimizations, "sensitivity": sensitivity,
}
(OUT / "results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
columns = [
    "annualGrossIncome", "annualTax", "annualTakeHome",
    "annualMortgagePayment", "annualPfOffset", "annualDisposableCash",
    "minimumMonthlyCash", "totalInterest", "presentValueCost",
]
with (OUT / "comparison.csv").open("w", encoding="utf-8-sig", newline="") as output:
    writer = csv.DictWriter(output, fieldnames=["id", "label", "feasible"] + columns)
    writer.writeheader()
    for record in records:
        writer.writerow({**{k: record[k] for k in ["id", "label", "feasible"]},
                         **{k: record["summary"][k] for k in columns}})
print("Saved experiments/results.json and comparison.csv")
