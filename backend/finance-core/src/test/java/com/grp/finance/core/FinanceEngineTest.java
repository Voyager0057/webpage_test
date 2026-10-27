package com.grp.finance.core;

import static com.grp.finance.core.Models.*;
import static com.grp.finance.core.Money.*;
import static org.junit.jupiter.api.Assertions.*;

import java.math.*;
import java.util.*;
import org.junit.jupiter.api.Test;

class FinanceEngineTest {
  private final FinanceEngine engine = new FinanceEngine();

  private void equal(String expected, BigDecimal actual) {
    assertEquals(
        0, d(expected).compareTo(actual), () -> "Expected " + expected + " but was " + actual);
  }

  private BigDecimal metric(CalculationResult r, String k) {
    return (BigDecimal) r.summary().get(k);
  }

  @Test
  void annualTaxOfficialBracketBoundaries() {
    TaxCalculator tax = new TaxCalculator();
    equal("0", tax.annualTax(d("-1")));
    equal("1080", tax.annualTax(d("36000")));
    equal("1080.10", tax.annualTax(d("36001")));
    equal("11880", tax.annualTax(d("144000")));
    equal("43080", tax.annualTax(d("300000")));
    equal("1080", tax.separateBonusTax(d("36000")));
    equal("3390.10", tax.separateBonusTax(d("36001")));
  }

  @Test
  void manuallyDerivedDefaultAnnualTax() {
    CalculationResult r = engine.calculate(new Scenario());
    // Wage base=360000-37800 social-25200 fund-60000 basic-12000 mortgage=225000.
    // Wage tax=225000*.20-16920=28080; bonus tax=60000*.10-210=5790.
    equal("33870", metric(r, "annualTax"));
    equal("323130", metric(r, "annualTakeHome"));
    equal("33870", metric(r, "annualWithheldTax"));
    assertEquals("SEPARATE", r.bonusComparison().selectedMode());
  }

  @Test
  void equalPrincipalManualExample() {
    var rows = new MortgageCalculator().schedule(d("120000"), d("0.12"), 12, "EQUAL_PRINCIPAL");
    equal("11200", rows.getFirst().payment());
    equal("10100", rows.getLast().payment());
    equal("7800", rows.stream().map(LoanRow::interest).reduce(ZERO, BigDecimal::add));
    equal("0", rows.getLast().remainingPrincipal());
  }

  @Test
  void annuityKnownPaymentAndZeroRate() {
    var calculator = new MortgageCalculator();
    var rows = calculator.schedule(d("100000"), d("0.06"), 360, "ANNUITY");
    equal("599.55", rows.getFirst().payment());
    equal("500", rows.getFirst().interest());
    equal("99.55", rows.getFirst().principal());
    equal("0", rows.getLast().remainingPrincipal());
    var zero = calculator.schedule(d("1200"), ZERO, 12, "ANNUITY");
    for (var row : zero) {
      equal("100", row.payment());
      equal("0", row.interest());
    }
  }

  @Test
  void mortgageInvariantsAcrossRepresentativeInputs() {
    var calculator = new MortgageCalculator();
    for (String method : List.of("ANNUITY", "EQUAL_PRINCIPAL"))
      for (String principal : List.of("0", "1", "1000.01", "2100000"))
        for (String rate : List.of("0", "0.021", "0.031", "0.12"))
          for (int months : List.of(1, 12, 120, 360)) {
            var rows = calculator.schedule(d(principal), d(rate), months, method);
            BigDecimal previous = amount(d(principal)), principalTotal = ZERO;
            for (var row : rows) {
              equal(previous.subtract(row.principal()).toPlainString(), row.remainingPrincipal());
              equal(row.principal().add(row.interest()).toPlainString(), row.payment());
              assertTrue(row.remainingPrincipal().signum() >= 0);
              previous = row.remainingPrincipal();
              principalTotal = principalTotal.add(row.principal());
            }
            equal(principal, principalTotal);
            equal("0", previous);
          }
  }

  @Test
  void monthlyFundAndCashConservation() {
    Scenario s = new Scenario();
    CalculationResult r = engine.calculate(s);
    BigDecimal previous = s.pfBalance;
    equal("0", r.monthly().getFirst().pfOffset());
    for (var row : r.monthly()) {
      equal(
          previous
              .add(row.employeePf())
              .add(row.employerPf())
              .subtract(row.pfOffset())
              .toPlainString(),
          row.pfBalance());
      equal(
          row.takeHome()
              .subtract(row.mortgagePayment())
              .add(row.pfOffset())
              .subtract(row.livingCost())
              .toPlainString(),
          row.disposableCash());
      assertTrue(row.pfOffset().compareTo(previous) <= 0);
      previous = row.pfBalance();
    }
    equal(
        r.monthly().stream()
            .map(MonthlyRow::disposableCash)
            .reduce(ZERO, BigDecimal::add)
            .toPlainString(),
        metric(r, "annualDisposableCash"));
  }

  @Test
  void annualSettlementNotInventedAsImmediateCash() {
    Scenario s = new Scenario();
    s.monthlySalary = d("4000");
    s.annualBonus = d("36000");
    s.bonusMonth = 1;
    s.bonusTaxMode = "COMBINED";
    s.socialInsuranceBase = ZERO;
    s.socialInsuranceMode = "BASE_RATE";
    s.pfBase = ZERO;
    s.pfEmployeeRate = ZERO;
    s.pfEmployerRate = ZERO;
    s.housePrice = ZERO;
    s.pfLoanAmount = ZERO;
    s.mortgageDeduction = false;
    var r = engine.calculate(s);
    equal("720", metric(r, "annualTax"));
    equal("1050", metric(r, "annualWithheldTax"));
    equal("330", metric(r, "annualSettlementRefund"));
    equal("82950", metric(r, "annualTakeHome"));
  }

  @Test
  void deductionExpiresAfter240MonthsAndNeverExceedsLoanTerm() {
    Scenario s = new Scenario();
    s.mortgageDeductionMonthsUsed = 239;
    var r = engine.calculate(s);
    equal("1000", r.monthly().getFirst().mortgageDeduction());
    for (int i = 1; i < 12; i++) equal("0", r.monthly().get(i).mortgageDeduction());
  }

  @Test
  void zeroDiscountCostIncludesExactlyPrincipalAndInterest() {
    Scenario s = new Scenario();
    s.annualDiscountRate = ZERO;
    var r = engine.calculate(s);
    equal(
        metric(r, "downPayment").add(metric(r, "totalRepayment")).toPlainString(),
        metric(r, "presentValueCost"));
  }

  @Test
  void defaultPublicRateAdaptsToShortTermAndCustomRateStays() {
    Scenario s = new Scenario();
    s.loanYears = 5;
    var r = engine.calculate(s);
    equal("0.021", r.input().pfAnnualRate);
    s.pfAnnualRate = d("0.024");
    equal("0.024", engine.calculate(s).input().pfAnnualRate);
  }

  @Test
  void infeasibleIsExplicitAndInvalidInputsRejected() {
    Scenario s = new Scenario();
    s.pfEligible = false;
    assertFalse(engine.calculate(s).feasible());
    s.loanYears = 31;
    Scenario invalid = s;
    assertThrows(IllegalArgumentException.class, () -> engine.calculate(invalid));
    s = new Scenario();
    s.taxYear = 2028;
    Scenario future = s;
    assertThrows(IllegalArgumentException.class, () -> engine.calculate(future));
  }

  @Test
  void optimizerMatchesIndependentSmallEnumeration() {
    Scenario s = new Scenario();
    s.minMonthlyCash = ZERO;
    OptimizationRequest request = new OptimizationRequest();
    request.scenario = s;
    request.minYears = 20;
    request.maxYears = 21;
    request.minPfAmount = ZERO;
    request.maxPfAmount = d("200000");
    request.pfStep = d("200000");
    var result = new Optimizer().optimize(request);
    BigDecimal best = null;
    int valid = 0;
    for (int years : List.of(20, 21))
      for (String p : List.of("0", "200000"))
        for (String method : List.of("ANNUITY", "EQUAL_PRINCIPAL")) {
          Scenario candidate = s.copy();
          candidate.loanYears = years;
          candidate.pfLoanAmount = d(p);
          candidate.repaymentMethod = method;
          var r = engine.calculate(candidate);
          if (r.feasible()) {
            valid++;
            BigDecimal cash = metric(r, "annualCashAfterMortgage");
            if (best == null || cash.compareTo(best) > 0) best = cash;
          }
        }
    assertEquals(8, result.evaluatedCount());
    assertEquals(valid, result.feasibleCount());
    equal(best.toPlainString(), result.plans().getFirst().score());
    assertEquals(result.evaluatedCount(), result.feasibleCount() + result.rejectedCount());
  }

  @Test
  void noFeasiblePlanAndBoundedSearch() {
    OptimizationRequest request = new OptimizationRequest();
    request.minYears = 30;
    request.maxYears = 30;
    request.minPfAmount = d("1000000");
    request.maxPfAmount = d("1000000");
    request.scenario.minMonthlyCash = d("1000000");
    var result = new Optimizer().optimize(request);
    assertEquals("NO_FEASIBLE", result.status());
    assertTrue(result.plans().isEmpty());
    request.pfStep = d("0.01");
    request.minPfAmount = ZERO;
    assertThrows(IllegalArgumentException.class, () -> new Optimizer().optimize(request));
  }

  @Test
  void zeroInterestLoansDoNotProduceMortgageInterestDeduction() {
    Scenario s = new Scenario();
    s.commercialAnnualRate = ZERO;
    s.pfAnnualRate = ZERO;
    for (var month : engine.calculate(s).monthly()) equal("0", month.mortgageDeduction());
  }

  @Test
  void downPaymentConstraintDistinguishesCommercialAndCombinationLoans() {
    Scenario s = new Scenario();
    s.downPaymentRate = d("0.15");
    s.pfLoanAmount = ZERO;
    s.minMonthlyCash = ZERO;
    assertTrue(engine.calculate(s).violations().stream().noneMatch(v -> v.contains("首付")));
    s.pfLoanAmount = d("500000");
    assertTrue(engine.calculate(s).violations().stream().anyMatch(v -> v.contains("首付")));
  }

  @Test
  void optimizationStoresEffectiveRateAndReproducesAcrossFiveYearBoundary() {
    OptimizationRequest request = new OptimizationRequest();
    request.scenario.housePrice = d("1000000");
    request.scenario.pfLoanAmount = d("200000");
    request.scenario.loanYears = 5;
    request.minYears = 5;
    request.maxYears = 6;
    request.minPfAmount = d("200000");
    request.maxPfAmount = d("200000");
    request.methods = List.of("ANNUITY");
    var result = new Optimizer().optimize(request);
    assertEquals(2, result.plans().size());
    for (var plan : result.plans()) {
      equal(plan.scenario().loanYears <= 5 ? "0.021" : "0.026", plan.scenario().pfAnnualRate);
      assertEquals(plan.summary(), engine.calculate(plan.scenario()).summary());
    }
  }



  @Test
  void ningboDistrictBoundsUseConfirmedCeiling() {
    Scenario s = new Scenario(); s.pfLoanAmount = ZERO; s.pfBase = d("2500");
    assertFalse(engine.calculate(s).feasible());
    s.district = "NINGHAI";
    assertTrue(engine.calculate(s).feasible());
    s.pfBase = d("38908");
    assertFalse(engine.calculate(s).feasible());
    s.confirmedPfBaseCeiling = d("38947");
    assertTrue(engine.calculate(s).feasible());
  }

  @Test
  void ningboFundRatesAndWholeYuanRounding() {
    Scenario s = new Scenario(); s.pfBase = d("2750"); s.pfLoanAmount = ZERO;
    s.pfEmployeeRate = d("0.05"); s.pfEmployerRate = d("0.05");
    equal("138", engine.calculate(s).monthly().getFirst().employeePf());
    s.pfEmployeeRate = d("0.12"); s.pfEmployerRate = d("0.12");
    equal("330", engine.calculate(s).monthly().getFirst().employeePf());
    s.pfEmployerRate = d("0.07");
    assertThrows(IllegalArgumentException.class, () -> engine.calculate(s));
  }

  @Test
  void ningboLoanCeilingsBalanceFloorAndContributionDuration() {
    Scenario s = new Scenario(); s.pfLoanAmount = d("1400000"); s.pfLoanLimit = d("1600000");
    assertTrue(engine.calculate(s).feasible());
    s.firstPfLoan = false;
    assertTrue(engine.calculate(s).violations().stream().anyMatch(v -> v.contains("普通额度")));
    s.firstPfLoan = true; s.pfBalance = d("1000"); s.pfLoanAmount = d("250000");
    assertTrue(engine.calculate(s).feasible());
    s.pfLoanAmount = d("250001");
    assertFalse(engine.calculate(s).feasible());
    s.pfLoanAmount = d("250000"); s.pfContributionMonths = 5;
    assertTrue(engine.calculate(s).violations().stream().anyMatch(v -> v.contains("不足6个月")));
  }

  @Test
  void monthlyWithdrawalReimbursesPreviousPaidInstallment() {
    Scenario s = new Scenario(); s.repaymentMethod = "EQUAL_PRINCIPAL";
    var result = engine.calculate(s);
    equal("0", result.monthly().getFirst().pfOffset());
    equal(result.schedule().getFirst().payment().toPlainString(), result.monthly().get(1).pfOffset());
    assertTrue(result.monthly().get(1).pfOffset().compareTo(result.monthly().get(1).mortgagePayment()) > 0);
    s.pfWithdrawalConfirmed = false;
    var unconfirmed = engine.calculate(s);
    equal("0", metric(unconfirmed, "annualPfOffset"));
    assertFalse(unconfirmed.feasible());
  }

  @Test
  void confirmedSocialAndSalaryComponentsAreSeparate() {
    Scenario s = new Scenario(); s.monthlyPerformance = d("2000"); s.monthlyAllowance = d("1000");
    s.confirmedMonthlySocial = d("2000");
    var r = engine.calculate(s);
    equal("456000", metric(r,"annualGrossIncome"));
    equal("2000", r.monthly().getFirst().employeeSocial());
    s.socialInsuranceMode = "BASE_RATE"; s.socialInsuranceBase = d("10000");
    equal("1050", engine.calculate(s).monthly().getFirst().employeeSocial());
  }

  @Test
  void monthlyPaymentAndConfirmedTermConstrainOptimization() {
    OptimizationRequest request = new OptimizationRequest();
    request.scenario.maxMonthlyPayment = d("100");
    request.minYears = 30; request.maxYears = 30;
    assertEquals("NO_FEASIBLE", new Optimizer().optimize(request).status());
    request.scenario.maxMonthlyPayment = ZERO; request.scenario.confirmedMaxLoanYears = 25;
    assertEquals("NO_FEASIBLE", new Optimizer().optimize(request).status());
  }

  @Test
  void bonusEligibilityAndMortgageTaxQualificationAreExplicit() {
    Scenario s = new Scenario(); s.bonusEligible = false;
    var r = engine.calculate(s);
    assertEquals("COMBINED", r.bonusComparison().selectedMode());
    s.firstHome = false; s.pfLoanAmount = ZERO; s.mortgageDeduction = true;
    equal("1000", engine.calculate(s).monthly().getFirst().mortgageDeduction());
    s.bonusTaxMode = "SEPARATE";
    assertThrows(IllegalArgumentException.class, () -> engine.calculate(s));
  }
}
