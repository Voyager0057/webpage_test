package com.grp.finance.core;

import static com.grp.finance.core.Models.*;
import static com.grp.finance.core.Money.*;

import java.math.*;
import java.util.*;

/** Deterministic January–December scenario engine; no I/O or current-clock dependency. */
public final class FinanceEngine {
  public static final String VERSION = "2.0.0", POLICY = NingboPolicy.VERSION;
  private final MortgageCalculator mortgages = new MortgageCalculator();
  private final TaxCalculator taxes = new TaxCalculator();

  public CalculationResult calculate(Scenario supplied) {
    if (supplied == null) throw new IllegalArgumentException("缺少 scenario");
    Scenario s = supplied.copy();
    s.requireValid();
    boolean referenceRateAdjusted = false;
    if (s.firstHome
        && s.pfLoanAmount.signum() > 0
        && (s.pfAnnualRate.compareTo(d("0.026")) == 0
            || s.pfAnnualRate.compareTo(d("0.021")) == 0)) {
      BigDecimal expected = s.loanYears <= 5 ? d("0.021") : d("0.026");
      referenceRateAdjusted = s.pfAnnualRate.compareTo(expected) != 0;
      s.pfAnnualRate = expected;
    }
    List<ScheduleRow> schedule = mortgages.combined(s);
    BigDecimal social = "CONFIRMED_AMOUNT".equals(s.socialInsuranceMode) ? amount(s.confirmedMonthlySocial) :
        amount(
            s.socialInsuranceBase.multiply(
                s.employeePensionRate.add(s.employeeMedicalRate).add(s.employeeUnemploymentRate)));
    // Ningbo: employee and employer contributions are each rounded to whole yuan first.
    BigDecimal
        employeePf = amount(s.pfBase.multiply(s.pfEmployeeRate).setScale(0, RoundingMode.HALF_UP)),
        employerPf = amount(s.pfBase.multiply(s.pfEmployerRate).setScale(0, RoundingMode.HALF_UP));
    BigDecimal grossRegular = sum(s.monthlySalary, s.monthlyPerformance, s.monthlyAllowance);
    BigDecimal regularTaxBase = ZERO;
    for (int m = 1; m <= 12; m++)
      regularTaxBase =
          regularTaxBase.add(
              grossRegular
                  .subtract(social)
                  .subtract(employeePf)
                  .subtract(d("5000"))
                  .subtract(s.otherMonthlyDeductions)
                  .subtract(deduction(s, m, schedule.get(m - 1).interest())));
    BigDecimal separateTotal =
        taxes.annualTax(regularTaxBase).add(taxes.separateBonusTax(s.annualBonus));
    BigDecimal combinedTotal = taxes.annualTax(regularTaxBase.add(s.annualBonus));
    String selected =
        !s.bonusEligible ? "COMBINED" : "AUTO".equals(s.bonusTaxMode)
            ? (separateTotal.compareTo(combinedTotal) <= 0 ? "SEPARATE" : "COMBINED")
            : s.bonusTaxMode;
    BigDecimal cumulativeTaxable = ZERO, withheld = ZERO, pfBalance = amount(s.pfBalance);
    List<MonthlyRow> monthly = new ArrayList<>();
    for (int m = 1; m <= 12; m++) {
      BigDecimal bonus = m == s.bonusMonth ? s.annualBonus : ZERO;
      BigDecimal gross = sum(grossRegular, bonus),
          deduction = deduction(s, m, schedule.get(m - 1).interest());
      BigDecimal taxable =
          grossRegular
              .add("COMBINED".equals(selected) ? bonus : ZERO)
              .subtract(social)
              .subtract(employeePf)
              .subtract(d("5000"))
              .subtract(s.otherMonthlyDeductions)
              .subtract(deduction);
      cumulativeTaxable = cumulativeTaxable.add(taxable);
      BigDecimal regularTax = maxZero(taxes.annualTax(cumulativeTaxable).subtract(withheld));
      withheld = withheld.add(regularTax);
      BigDecimal tax =
          sum(regularTax, "SEPARATE".equals(selected) ? taxes.separateBonusTax(bonus) : ZERO);
      BigDecimal takeHome = amount(gross.subtract(social).subtract(employeePf).subtract(tax));
      ScheduleRow loan = schedule.get(m - 1);
      // Withdrawal reimburses the preceding month's paid installment. Current contributions
      // are posted after withdrawal: conservative timing, no Shanghai-specific 0.01 reserve.
      BigDecimal openingPfBalance = pfBalance;
      BigDecimal offset =
          "MONTHLY_OFFSET".equals(s.providentUsage) && s.pfWithdrawalConfirmed && m > 1
              ? pfBalance.min(schedule.get(m - 2).payment())
              : ZERO;
      pfBalance = amount(sum(pfBalance, employeePf, employerPf).subtract(offset));
      BigDecimal cash = amount(takeHome.subtract(loan.payment()).add(offset)),
          disposable = amount(cash.subtract(s.monthlyLivingCost));
      monthly.add(
          new MonthlyRow(
              m,
              s.taxYear + "-" + String.format(Locale.ROOT, "%02d", m),
              gross,
              social,
              employeePf,
              employerPf,
              amount(taxable),
              amount(maxZero(cumulativeTaxable)),
              tax,
              takeHome,
              loan.payment(),
              amount(offset),
              cash,
              amount(s.monthlyLivingCost),
              disposable,
              pfBalance,
              loan.remainingPrincipal(),
              deduction, openingPfBalance));
    }
    List<String> violations = new ArrayList<>();
    BigDecimal minimumBase = NingboPolicy.minimumContributionBase(s.district);
    if (s.pfBase.signum() > 0 && (s.pfBase.compareTo(minimumBase) < 0
        || s.pfBase.compareTo(s.confirmedPfBaseCeiling) > 0))
      violations.add("公积金缴存基数超出所选区县下限或已确认上限");
    if (s.loanYears > s.confirmedMaxLoanYears)
      violations.add("贷款期限超过用户确认的可贷期限");
    BigDecimal minimumDownPayment = s.pfLoanAmount.signum() > 0 ? d("0.20") : d("0.15");
    if (s.loanAmount().signum() > 0 && s.downPaymentRate.compareTo(minimumDownPayment) < 0)
      violations.add("首付比例低于本模型下限（普通公积金/组合20%，商贷15%）");
    if (s.pfLoanAmount.signum() > 0) {
      if (s.pfEmployeeRate.signum() == 0 || s.pfEmployerRate.signum() == 0 || s.pfBase.signum() == 0)
        violations.add("未缴存公积金，不能确认公积金贷款资格");
      if (s.pfContributionMonths < 6) violations.add("公积金连续缴存不足6个月");
      if (s.pfLoanAmount.compareTo(NingboPolicy.ordinaryLoanLimit(s)) > 0)
        violations.add("公积金贷款超过宁波普通额度上限");
      if (s.pfLoanAmount.compareTo(NingboPolicy.balanceLoanLimit(s)) > 0)
        violations.add("公积金贷款超过余额25倍与25万元保底计算的额度");
      if (!s.firstHome) violations.add("当前贷款模型仅支持普通首套住房");
    }
    if ("MONTHLY_OFFSET".equals(s.providentUsage) && !s.pfWithdrawalConfirmed)
      violations.add("尚未确认符合还贷提取条件，本次未计入提取金额");
    BigDecimal peakPayment = schedule.stream().map(ScheduleRow::payment).max(BigDecimal::compareTo).orElse(ZERO);
    if (s.maxMonthlyPayment.signum() > 0 && peakPayment.compareTo(s.maxMonthlyPayment) > 0)
      violations.add("最高月供超过用户设定的月供上限");
    if (s.pfLoanAmount.signum() > 0 && !s.pfEligible) violations.add("未声明满足公积金贷款资格");
    if (s.pfLoanAmount.compareTo(s.pfLoanLimit) > 0) violations.add("公积金贷款超过用户确认的可贷额度");
    BigDecimal minCash =
        monthly.stream().map(MonthlyRow::disposableCash).min(BigDecimal::compareTo).orElse(ZERO);
    if (minCash.compareTo(s.minMonthlyCash) < 0) violations.add("至少一个月份的生活支出后现金低于最低保留金额");
    List<String> warnings = new ArrayList<>();
    if (!s.firstHome) warnings.add("当前模型仅提供普通首套住房的贷款约束检查。");
    if (!s.bonusEligible && s.annualBonus.signum() > 0)
      warnings.add("未确认全年一次性奖金资格，奖金已并入综合所得。");
    if (referenceRateAdjusted)
      warnings.add(
          "输入匹配官方首套利率参考档，已按期限自动适配为" + s.pfAnnualRate.multiply(d("100")) + "%；有效输入快照保留调整后的利率。");

    if (s.confirmedPfBaseCeiling.compareTo(d("38907")) == 0)
      warnings.add("公积金基数上限采用已查阅的2026年6月临时参考38907元；后续上限须按本人已确认值更新。");
    if (social.add(employeePf).compareTo(grossRegular) > 0)
      warnings.add("个人缴费高于普通月现金收入，请检查缴费基数与工资口径。");
    warnings.add("社保金额、可贷额度和期限按用户确认值测算；贷款审批中的信用、房龄及其他条件未联网核验。");
    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("annualGrossIncome", sumMonthly(monthly, MonthlyRow::grossIncome));
    // Annual final tax and actual withheld are separated: late-year deductions can cause an annual
    // refund.
    BigDecimal annualFinal = "SEPARATE".equals(selected) ? separateTotal : combinedTotal;
    summary.put("annualTax", amount(annualFinal));
    summary.put("annualWithheldTax", sumMonthly(monthly, MonthlyRow::tax));
    summary.put(
        "annualSettlementRefund",
        amount(sumMonthly(monthly, MonthlyRow::tax).subtract(annualFinal)));
    summary.put("annualTakeHome", sumMonthly(monthly, MonthlyRow::takeHome));
    summary.put("annualMortgagePayment", sumMonthly(monthly, MonthlyRow::mortgagePayment));
    summary.put("annualPfOffset", sumMonthly(monthly, MonthlyRow::pfOffset));
    summary.put("annualCashAfterMortgage", sumMonthly(monthly, MonthlyRow::cashAfterMortgage));
    summary.put("annualDisposableCash", sumMonthly(monthly, MonthlyRow::disposableCash));
    summary.put("minimumMonthlyCash", minCash);
    summary.put("firstMonthlyPayment", schedule.getFirst().payment());
    summary.put(
        "maxMonthlyPayment",
        schedule.stream().map(ScheduleRow::payment).max(BigDecimal::compareTo).orElse(ZERO));
    summary.put(
        "totalInterest",
        amount(schedule.stream().map(ScheduleRow::interest).reduce(ZERO, BigDecimal::add)));
    summary.put(
        "totalRepayment",
        amount(schedule.stream().map(ScheduleRow::payment).reduce(ZERO, BigDecimal::add)));
    summary.put("commercialPrincipal", amount(s.loanAmount().subtract(s.pfLoanAmount)));
    summary.put("pfPrincipal", amount(s.pfLoanAmount));
    summary.put("totalLoan", s.loanAmount());
    BigDecimal downPayment = amount(s.housePrice.multiply(s.downPaymentRate));
    summary.put("downPayment", downPayment);
    summary.put("endingPfBalance", pfBalance);
    summary.put(
        "presentValueCost",
        amount(downPayment.add(paymentPresentValue(schedule, s.annualDiscountRate))));
    summary.put(
        "realPaymentCost",
        amount(downPayment.add(paymentPresentValue(schedule, s.annualInflationRate))));
    summary.put("comparisonHorizonMonths", 360);
    summary.put("loanYears", s.loanYears);
    summary.put("repaymentMethod", s.repaymentMethod);
    summary.put("bonusTaxMode", selected);
    return new CalculationResult(
        s,
        Collections.unmodifiableMap(summary),
        List.copyOf(monthly),
        schedule,
        violations.isEmpty(),
        List.copyOf(violations),
        List.copyOf(warnings),
        assumptions(),
        POLICY,
        VERSION,
        new BonusComparison(selected, amount(separateTotal), amount(combinedTotal)));
  }

  private BigDecimal deduction(Scenario s, int month, BigDecimal actualInterest) {
    return s.mortgageDeduction
            && s.loanAmount().signum() > 0
            && actualInterest.signum() > 0
            && s.mortgageDeductionMonthsUsed + month <= 240
        ? d("1000.00")
        : ZERO;
  }

  private BigDecimal sumMonthly(
      List<MonthlyRow> rows, java.util.function.Function<MonthlyRow, BigDecimal> f) {
    return amount(rows.stream().map(f).reduce(ZERO, BigDecimal::add));
  }

  private BigDecimal paymentPresentValue(List<ScheduleRow> schedule, BigDecimal annualRate) {
    // One annual-effective rate converted once; exact monetary arithmetic thereafter.
    BigDecimal monthlyFactor =
        BigDecimal.valueOf(Math.pow(1 + annualRate.doubleValue(), 1.0 / 12.0));
    BigDecimal discount = BigDecimal.ONE, pv = ZERO;
    for (ScheduleRow row : schedule) {
      discount = discount.multiply(monthlyFactor, MC);
      pv = pv.add(row.payment().divide(discount, MC));
    }
    return amount(pv);
  }

  public static List<String> assumptions() {
    return List.of(
        "宁波普通首套、单一借款人、全年同一雇主；按选定政策快照构建1月至12月假设情景，不重建年中政策和缴费基数调整。",
        "工资、绩效和应税津贴按月固定；社保使用已确认个人金额，或用户确认的基数与比例。单位社保不从个人工资再次扣除。",
        "公积金个人与单位比例一致，支持5%至12%；缴存基数下限按区县，上限为已确认输入；双方缴存分别四舍五入到元。",
        "普通公积金额度同时受首次首套160万元或其他普通130万元、余额25倍（保底25万元）及用户已确认额度限制；特殊上浮和共同借款未纳入。",
        "还贷提取按上月已还本息与上月末账户余额孰低计入当月现金，首月无提取，当月缴存次月可用；假定已办理相关提取手续，不模拟账户利息。",
        "符合条件的一次性奖金可单独计税或并入综合所得，自动模式比较全年税额；未确认资格则并入。尚未收到的汇算退税不计入本年现金。",
        "商贷和公积金贷款采用相同期限与还款方式；利率固定，首套公积金参考利率按5年期限档适配，自定义报价保持不变。模型支持1至30年，不代表银行全部产品期限。",
        "个税累计预扣，房贷利息扣除资格独立于公积金首套认定，按用户声明及最长240个月处理；其他扣除不得重复包含房贷利息或不兼容的租金扣除。",
        "现金流覆盖测算年度，贷款明细覆盖全期；付款现值包含首付及全部合同还款，统一360月观察期且到期后付款为零，不代表净财富。",
        "通胀调整付款成本与折现付款现值分别计算，不叠加两种调整；金额按分结算，最后一期结清本金。");
  }
}
