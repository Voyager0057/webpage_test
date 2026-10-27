package com.grp.finance.core;

import static com.grp.finance.core.Money.*;

import java.math.BigDecimal;
import java.util.*;

public class OptimizationRequest {
  public Scenario scenario = new Scenario();
  public int minYears = 10, maxYears = 30, yearStep = 1;
  public BigDecimal pfStep = d("200000"), minPfAmount = ZERO, maxPfAmount = d("1000000");
  public List<String> methods = List.of("ANNUITY", "EQUAL_PRINCIPAL");
  public String objective = "CASH_FLOW";

  public void validate() {
    if (scenario == null) throw new IllegalArgumentException("缺少 scenario");
    scenario.requireValid();
    if (minYears < 1 || maxYears > 30 || minYears > maxYears || yearStep < 1 || yearStep > 30)
      throw new IllegalArgumentException("期限范围须在1–30年内，步长必须为正数");
    if (pfStep == null
        || minPfAmount == null
        || maxPfAmount == null
        || pfStep.signum() <= 0
        || minPfAmount.signum() < 0
        || minPfAmount.compareTo(maxPfAmount) > 0
        || maxPfAmount.compareTo(d("1000000000")) > 0)
      throw new IllegalArgumentException("公积金金额范围和正步长无效");
    if (methods == null
        || methods.isEmpty()
        || methods.size() > 2
        || methods.stream()
            .anyMatch(m -> m == null || !Set.of("ANNUITY", "EQUAL_PRINCIPAL").contains(m)))
      throw new IllegalArgumentException("请选择1–2个有效还款方式");
    if (!Set.of("CASH_FLOW", "INTEREST", "PRESENT_VALUE").contains(Objects.toString(objective, "")))
      throw new IllegalArgumentException("无效优化目标");
    BigDecimal count = maxPfAmount.subtract(minPfAmount).divideToIntegralValue(pfStep).add(d("2"));
    if (count
            .multiply(BigDecimal.valueOf((maxYears - minYears) / yearStep + 2L))
            .multiply(BigDecimal.valueOf(methods.size()))
            .compareTo(d("2500"))
        > 0) throw new IllegalArgumentException("搜索范围超过2500个候选，请增大步长或缩小范围");
  }
}
