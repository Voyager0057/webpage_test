package com.grp.finance.core;

import static com.grp.finance.core.Money.*;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.*;

/** Anonymous input. Monetary values and rates must be finite exact decimals. */
public class Scenario implements Cloneable {
  public String city = "NINGBO", district = "YINZHOU";
  public int taxYear = 2026;
  public BigDecimal monthlySalary = d("30000"), monthlyPerformance = ZERO,
      monthlyAllowance = ZERO, annualBonus = d("60000");
  public int bonusMonth = 12;
  public String bonusTaxMode = "AUTO";
  public boolean bonusEligible = true;
  public String socialInsuranceMode = "CONFIRMED_AMOUNT";
  public BigDecimal confirmedMonthlySocial = d("3150");
  public BigDecimal socialInsuranceBase = d("30000"),
      employeePensionRate = d("0.08"),
      employeeMedicalRate = d("0.02"),
      employeeUnemploymentRate = d("0.005");
  public BigDecimal pfBase = d("30000"),
      pfEmployeeRate = d("0.07"),
      pfEmployerRate = d("0.07"),
      pfBalance = d("100000"),
      pfLoanLimit = d("1000000");
  // The June official notice explicitly calls this a temporary reference, not a verified latest cap.
  public BigDecimal confirmedPfBaseCeiling = d("38907");
  public int pfContributionMonths = 24, confirmedMaxLoanYears = 30;
  public boolean firstPfLoan = true, pfWithdrawalConfirmed = true;
  public boolean pfEligible = true, firstHome = true, mortgageDeduction = true;
  public int mortgageDeductionMonthsUsed = 0;
  public BigDecimal otherMonthlyDeductions = ZERO,
      housePrice = d("3000000"),
      downPaymentRate = d("0.30");
  public int loanYears = 30;
  public BigDecimal pfLoanAmount = d("1000000"),
      commercialAnnualRate = d("0.031"),
      pfAnnualRate = d("0.026");
  public String repaymentMethod = "ANNUITY", providentUsage = "MONTHLY_OFFSET";
  public BigDecimal monthlyLivingCost = d("6000"),
      minMonthlyCash = d("1000"),
      annualDiscountRate = d("0.03"),
      annualInflationRate = d("0.02");
  public BigDecimal maxMonthlyPayment = ZERO;

  public Scenario copy() {
    try {
      return (Scenario) clone();
    } catch (CloneNotSupportedException e) {
      throw new IllegalStateException(e);
    }
  }

  public BigDecimal loanAmount() {
    return amount(housePrice.subtract(amount(housePrice.multiply(downPaymentRate))));
  }

  public List<String> validate() {
    List<String> errors = new ArrayList<>();
    for (Field f : getClass().getFields())
      if (f.getType() == BigDecimal.class)
        try {
          BigDecimal v = (BigDecimal) f.get(this);
          if (v == null) {
            errors.add(f.getName() + " 不能为空");
            continue;
          }
          if (v.signum() < 0
              || v.compareTo(d("1000000000")) > 0
              || v.scale() > 10
              || v.precision() > 24) errors.add(f.getName() + " 必须为有效非负数，最多10位小数且不超过10亿元");
        } catch (IllegalAccessException e) {
          throw new IllegalStateException(e);
        }
    if (!errors.isEmpty()) return errors;
    if (!"NINGBO".equals(city)) errors.add("当前仅支持宁波 NINGBO 情景");
    if (!NingboPolicy.DISTRICTS.containsKey(Objects.toString(district, ""))) errors.add("请选择有效的宁波区县");
    if (taxYear != 2026) errors.add("当前核验政策情景仅支持2026年");
    if (bonusMonth < 1 || bonusMonth > 12) errors.add("奖金月份必须在1–12之间");
    if (loanYears < 1 || loanYears > 30) errors.add("贷款期限必须在1–30年之间");
    if (confirmedMaxLoanYears < 1 || confirmedMaxLoanYears > 30) errors.add("已确认可贷期限须在模型支持的1–30年范围内");
    if (pfContributionMonths < 0 || pfContributionMonths > 720) errors.add("连续缴存月数必须在0–720之间");
    if (!Set.of("CONFIRMED_AMOUNT", "BASE_RATE").contains(Objects.toString(socialInsuranceMode, ""))) errors.add("无效社保输入方式");
    if (confirmedPfBaseCeiling.compareTo(d("2660")) < 0) errors.add("已确认缴存基数上限不得低于2660元");
    if (mortgageDeductionMonthsUsed < 0 || mortgageDeductionMonthsUsed > 240)
      errors.add("房贷扣除已使用月数必须在0–240之间");
    if (!Set.of("AUTO", "SEPARATE", "COMBINED").contains(Objects.toString(bonusTaxMode, "")))
      errors.add("无效奖金计税模式");
    if (!Set.of("ANNUITY", "EQUAL_PRINCIPAL").contains(Objects.toString(repaymentMethod, "")))
      errors.add("无效还款方式");
    if (!Set.of("NONE", "MONTHLY_OFFSET").contains(Objects.toString(providentUsage, "")))
      errors.add("无效公积金使用模式");
    bounded(errors, "首付比例", downPaymentRate, BigDecimal.ONE);
    for (BigDecimal r :
        List.of(commercialAnnualRate, pfAnnualRate, annualDiscountRate, annualInflationRate))
      bounded(errors, "利率/折现率/通胀率", r, d("0.30"));
    bounded(errors, "养老比例", employeePensionRate, d("0.30"));
    bounded(errors, "医疗比例", employeeMedicalRate, d("0.30"));
    bounded(errors, "失业比例", employeeUnemploymentRate, d("0.30"));
    for (BigDecimal rate : List.of(pfEmployeeRate, pfEmployerRate))
      if (rate.signum() != 0 && (rate.compareTo(d("0.05")) < 0 || rate.compareTo(d("0.12")) > 0))
        errors.add("宁波公积金缴存比例应为5%–12%；未缴存选0");
    if (pfEmployeeRate.compareTo(pfEmployerRate) != 0) errors.add("宁波单位与个人公积金缴存比例应一致");
    if (!bonusEligible && "SEPARATE".equals(bonusTaxMode)) errors.add("不符合全年一次性奖金条件时应并入综合所得");
    if (pfLoanAmount.compareTo(loanAmount()) > 0) errors.add("公积金贷款不能超过购房总贷款额");
    return errors;
  }

  private void bounded(List<String> e, String label, BigDecimal v, BigDecimal max) {
    if (v.compareTo(max) > 0) e.add(label + " 超出允许范围 0–" + max);
  }

  public void requireValid() {
    List<String> e = validate();
    if (!e.isEmpty()) throw new IllegalArgumentException(String.join("；", e));
  }
}
