package com.grp.finance.core;

import java.math.*;

public final class Money {
  public static final BigDecimal ZERO = new BigDecimal("0.00");
  public static final MathContext MC = new MathContext(24, RoundingMode.HALF_UP);

  private Money() {}

  public static BigDecimal d(String v) {
    return new BigDecimal(v);
  }

  public static BigDecimal amount(BigDecimal v) {
    return v.setScale(2, RoundingMode.HALF_UP);
  }

  public static BigDecimal sum(BigDecimal... v) {
    BigDecimal r = ZERO;
    for (BigDecimal n : v) r = r.add(n);
    return amount(r);
  }

  public static BigDecimal min(BigDecimal a, BigDecimal b) {
    return a.min(b);
  }

  public static BigDecimal maxZero(BigDecimal v) {
    return v.max(ZERO);
  }
}
