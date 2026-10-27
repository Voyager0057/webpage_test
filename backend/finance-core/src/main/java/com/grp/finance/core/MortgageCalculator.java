package com.grp.finance.core;

import static com.grp.finance.core.Models.*;
import static com.grp.finance.core.Money.*;

import java.math.*;
import java.util.*;

public final class MortgageCalculator {
  public List<LoanRow> schedule(
      BigDecimal original, BigDecimal annualRate, int months, String method) {
    if (original == null
        || annualRate == null
        || original.signum() < 0
        || annualRate.signum() < 0
        || months < 1
        || months > 360
        || !Set.of("ANNUITY", "EQUAL_PRINCIPAL").contains(method))
      throw new IllegalArgumentException("无效贷款参数");
    BigDecimal balance = amount(original), r = annualRate.divide(d("12"), MC);
    BigDecimal fixedPrincipal = original.divide(BigDecimal.valueOf(months), MC);
    BigDecimal fixedPayment;
    if (r.signum() == 0) fixedPayment = amount(fixedPrincipal);
    else {
      BigDecimal power = BigDecimal.ONE.add(r).pow(months, MC);
      fixedPayment =
          amount(
              original
                  .multiply(r, MC)
                  .multiply(power, MC)
                  .divide(power.subtract(BigDecimal.ONE), MC));
    }
    List<LoanRow> rows = new ArrayList<>();
    for (int m = 1; m <= months; m++) {
      BigDecimal interest = amount(balance.multiply(r));
      BigDecimal principal =
          "EQUAL_PRINCIPAL".equals(method)
              ? amount(fixedPrincipal)
              : maxZero(fixedPayment.subtract(interest));
      if (m == months || principal.compareTo(balance) > 0) principal = balance;
      balance = amount(balance.subtract(principal));
      rows.add(new LoanRow(m, sum(principal, interest), principal, interest, balance));
    }
    return List.copyOf(rows);
  }

  public List<ScheduleRow> combined(Scenario s) {
    int n = s.loanYears * 12;
    BigDecimal commercial = s.loanAmount().subtract(s.pfLoanAmount);
    List<LoanRow> a = schedule(commercial, s.commercialAnnualRate, n, s.repaymentMethod),
        b = schedule(s.pfLoanAmount, s.pfAnnualRate, n, s.repaymentMethod);
    List<ScheduleRow> rows = new ArrayList<>();
    for (int i = 0; i < n; i++) {
      LoanRow x = a.get(i), y = b.get(i);
      rows.add(
          new ScheduleRow(
              i + 1,
              sum(x.payment(), y.payment()),
              sum(x.principal(), y.principal()),
              sum(x.interest(), y.interest()),
              x.payment(),
              y.payment(),
              sum(x.remainingPrincipal(), y.remainingPrincipal()),
              x.principal(), x.interest(), x.remainingPrincipal(),
              y.principal(), y.interest(), y.remainingPrincipal()));
    }
    return List.copyOf(rows);
  }
}
