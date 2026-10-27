package com.grp.finance.api;

import com.fasterxml.jackson.databind.*;
import com.grp.finance.core.*;
import com.grp.finance.core.Models.*;
import java.math.*;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class FinanceController {
  private final FinanceEngine engine = new FinanceEngine();
  private final Optimizer optimizer = new Optimizer();
  private final PolicyRepository repository;
  private final ObjectMapper mapper;
  private final Environment environment;

  public FinanceController(PolicyRepository r, ObjectMapper m, Environment e) {
    repository = r;
    mapper = m;
    environment = e;
  }

  @GetMapping("/health")
  public Map<String, Object> health() {
    repository.count();
    return Map.of(
        "status",
        "UP",
        "engineVersion",
        FinanceEngine.VERSION,
        "database",
        Arrays.asList(environment.getActiveProfiles()).contains("postgres")
            ? "PostgreSQL"
            : "H2 local");
  }

  @GetMapping("/policies")
  public JsonNode policies() throws Exception {
    return document("current");
  }

  @GetMapping("/examples")
  public JsonNode examples() throws Exception {
    return document("examples");
  }

  private JsonNode document(String id) throws Exception {
    return mapper.readTree(repository.findById(id).orElseThrow().content);
  }

  @PostMapping("/calculate")
  public CalculationResult calculate(@RequestBody Scenario scenario) {
    return engine.calculate(scenario);
  }

  @PostMapping("/optimize")
  public OptimizationResult optimize(@RequestBody OptimizationRequest request) {
    return optimizer.optimize(request);
  }

  public static class SensitivityRequest {
    public Scenario scenario = new Scenario();
    public String parameter = "commercialAnnualRate";
    public List<BigDecimal> values =
        List.of(
            Money.d("0.021"),
            Money.d("0.026"),
            Money.d("0.031"),
            Money.d("0.036"),
            Money.d("0.041"));
  }

  @PostMapping({"/sensitivity", "/scenario-changes"})
  public Map<String, Object> sensitivity(@RequestBody SensitivityRequest request) {
    if (request.scenario == null
        || request.parameter == null
        || request.values == null
        || request.values.isEmpty()
        || request.values.size() > 15
        || request.values.stream().anyMatch(Objects::isNull))
      throw new IllegalArgumentException("条件比较需有效场景及1–15个数值");
    if (!Set.of("commercialAnnualRate", "monthlySalary", "pfLoanAmount", "loanYears", "bonusShare")
        .contains(request.parameter)) throw new IllegalArgumentException("不支持该比较参数");
    List<Map<String, Object>> points = new ArrayList<>();
    for (BigDecimal v : request.values) {
      Scenario s = request.scenario.copy();
      switch (request.parameter) {
        case "bonusShare" -> {
          if (v.signum() < 0 || v.compareTo(Money.d("0.50")) > 0)
            throw new IllegalArgumentException("奖金占比须在0%–50%之间");
          BigDecimal annual = s.monthlySalary.add(s.monthlyPerformance).add(s.monthlyAllowance)
              .multiply(Money.d("12")).add(s.annualBonus);
          s.monthlySalary = Money.amount(annual.multiply(BigDecimal.ONE.subtract(v))
              .divide(Money.d("12"), Money.MC));
          s.monthlyPerformance = Money.ZERO;
          s.monthlyAllowance = Money.ZERO;
          s.annualBonus = Money.amount(annual.subtract(s.monthlySalary.multiply(Money.d("12"))));
        }
        case "commercialAnnualRate" -> s.commercialAnnualRate = v;
        case "monthlySalary" -> s.monthlySalary = v;
        case "pfLoanAmount" -> s.pfLoanAmount = v;
        case "loanYears" -> {
          try {
            s.loanYears = v.intValueExact();
          } catch (ArithmeticException e) {
            throw new IllegalArgumentException("期限必须是整年");
          }
        }
        default -> throw new IllegalArgumentException("不支持该参数");
      }
      CalculationResult result = engine.calculate(s);
      Map<String, Object> point = new LinkedHashMap<>();
      point.put("value", v);
      point.put("feasible", result.feasible());
      for (String key :
          List.of(
              "annualDisposableCash", "annualCashAfterMortgage", "annualGrossIncome", "annualTax",
              "annualTakeHome", "totalInterest", "presentValueCost", "realPaymentCost", "minimumMonthlyCash"))
        point.put(key, result.summary().get(key));
      point.put("violations", result.violations());
      point.put("scenario", result.input());
      points.add(point);
    }
    return Map.of(
        "parameter",
        request.parameter,
        "points",
        points,
        "assumption",
        "条件比较保持其他输入不变，不自动重新优化。奖金占比比较固定全年税前总收入；工资与奖金的安排须符合实际雇佣条件。缴费参数保持不变，公积金参考利率按期限适配。");
  }
}
