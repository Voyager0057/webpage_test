package com.grp.finance.core;

import java.math.BigDecimal;
import java.util.*;

public final class Models {
  private Models() {}

  public record LoanRow(
      int month,
      BigDecimal payment,
      BigDecimal principal,
      BigDecimal interest,
      BigDecimal remainingPrincipal) {}

  public record ScheduleRow(
      int month,
      BigDecimal payment,
      BigDecimal principal,
      BigDecimal interest,
      BigDecimal commercialPayment,
      BigDecimal pfPayment,
      BigDecimal remainingPrincipal,
      BigDecimal commercialPrincipal, BigDecimal commercialInterest, BigDecimal commercialBalance,
      BigDecimal pfPrincipal, BigDecimal pfInterest, BigDecimal pfRemainingPrincipal) {}

  public record MonthlyRow(
      int month,
      String label,
      BigDecimal grossIncome,
      BigDecimal employeeSocial,
      BigDecimal employeePf,
      BigDecimal employerPf,
      BigDecimal taxableIncome,
      BigDecimal cumulativeTaxableIncome,
      BigDecimal tax,
      BigDecimal takeHome,
      BigDecimal mortgagePayment,
      BigDecimal pfOffset,
      BigDecimal cashAfterMortgage,
      BigDecimal livingCost,
      BigDecimal disposableCash,
      BigDecimal pfBalance,
      BigDecimal remainingPrincipal,
      BigDecimal mortgageDeduction,
      BigDecimal openingPfBalance) {}

  public record BonusComparison(
      String selectedMode, BigDecimal separateTax, BigDecimal combinedTax) {}

  public record CalculationResult(
      Scenario input,
      Map<String, Object> summary,
      List<MonthlyRow> monthly,
      List<ScheduleRow> schedule,
      boolean feasible,
      List<String> violations,
      List<String> warnings,
      List<String> assumptions,
      String policyVersion,
      String engineVersion,
      BonusComparison bonusComparison) {}

  public record Plan(
      int rank,
      Scenario scenario,
      Map<String, Object> summary,
      BigDecimal score,
      List<String> explanations) {}

  public record ParetoPoint(
      int loanYears,
      BigDecimal pfLoanAmount,
      String paymentMethod,
      BigDecimal annualDisposableCash,
      BigDecimal totalInterest,
      BigDecimal presentValueCost) {}

  public record OptimizationResult(
      String objective,
      String status,
      CalculationResult baseline,
      List<Plan> plans,
      List<ParetoPoint> pareto,
      int evaluatedCount,
      int feasibleCount,
      int rejectedCount,
      Map<String, Integer> rejectionReasons,
      long elapsedMs,
      String searchDescription,
      Map<String, Object> searchSettings) {}
}
