package com.grp.finance.core;

import static com.grp.finance.core.Money.*;
import java.math.BigDecimal;
import java.util.Map;

/** Reviewed ordinary-loan profile; special increases and joint borrowers are outside this version. */
public final class NingboPolicy {
  private NingboPolicy() {}
  public static final String VERSION = "NB-2026.10-v2";
  public static final BigDecimal FIRST_HOME_FIRST_LOAN_LIMIT = d("1600000");
  public static final BigDecimal OTHER_ORDINARY_LIMIT = d("1300000");
  public static final BigDecimal BALANCE_MULTIPLIER = d("25"), BALANCE_FLOOR = d("250000");
  public static final Map<String, String> DISTRICTS = Map.of(
      "HAISHU", "海曙区", "JIANGBEI", "江北区", "ZHENHAI", "镇海区", "BEILUN", "北仑区",
      "YINZHOU", "鄞州区", "FENGHUA", "奉化区", "YUYAO", "余姚市", "CIXI", "慈溪市",
      "NINGHAI", "宁海县", "XIANGSHAN", "象山县");

  public static BigDecimal minimumContributionBase(String district) {
    return java.util.Set.of("YUYAO", "CIXI", "NINGHAI", "XIANGSHAN").contains(district)
        ? d("2430") : d("2660");
  }

  public static BigDecimal ordinaryLoanLimit(Scenario s) {
    return s.firstHome && s.firstPfLoan ? FIRST_HOME_FIRST_LOAN_LIMIT : OTHER_ORDINARY_LIMIT;
  }

  public static BigDecimal balanceLoanLimit(Scenario s) {
    return s.pfBalance.multiply(BALANCE_MULTIPLIER).max(BALANCE_FLOOR);
  }
}
