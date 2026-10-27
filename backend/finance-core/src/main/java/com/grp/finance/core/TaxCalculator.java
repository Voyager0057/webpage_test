package com.grp.finance.core;

import static com.grp.finance.core.Money.*;

import java.math.BigDecimal;

public final class TaxCalculator {
  private static final String[] LIMITS = {
    "36000", "144000", "300000", "420000", "660000", "960000"
  };
  private static final String[] RATES = {"0.03", "0.10", "0.20", "0.25", "0.30", "0.35", "0.45"};
  private static final String[] QUICK = {"0", "2520", "16920", "31920", "52920", "85920", "181920"};
  private static final String[] BONUSQUICK = {"0", "210", "1410", "2660", "4410", "7160", "15160"};

  public BigDecimal annualTax(BigDecimal taxable) {
    BigDecimal x = maxZero(taxable);
    int k = bracket(x);
    return amount(maxZero(x.multiply(d(RATES[k])).subtract(d(QUICK[k]))));
  }

  public BigDecimal separateBonusTax(BigDecimal bonus) {
    int k = bracket(bonus);
    return amount(maxZero(bonus.multiply(d(RATES[k])).subtract(d(BONUSQUICK[k]))));
  }

  // Comparing annual bonus against annual thresholds is equivalent to bonus/12 against monthly
  // thresholds.
  private int bracket(BigDecimal annual) {
    int k = 0;
    while (k < LIMITS.length && annual.compareTo(d(LIMITS[k])) > 0) k++;
    return k;
  }
}
