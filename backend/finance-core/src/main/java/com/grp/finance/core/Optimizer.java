package com.grp.finance.core;

import static com.grp.finance.core.Models.*;
import static com.grp.finance.core.Money.*;

import java.math.*;
import java.util.*;

public final class Optimizer {
  private final FinanceEngine engine = new FinanceEngine();

  private record Candidate(Scenario scenario, Map<String, Object> summary) {}

  public OptimizationResult optimize(OptimizationRequest request) {
    request.validate();
    long start = System.nanoTime();
    CalculationResult baseline = engine.calculate(request.scenario);
    TreeSet<Integer> years = new TreeSet<>();
    for (int y = request.minYears; y <= request.maxYears; y += request.yearStep) years.add(y);
    years.add(request.maxYears);
    if (request.scenario.loanYears >= request.minYears
        && request.scenario.loanYears <= request.maxYears) years.add(request.scenario.loanYears);
    TreeSet<BigDecimal> amounts = new TreeSet<>();
    for (BigDecimal p = request.minPfAmount;
        p.compareTo(request.maxPfAmount) <= 0;
        p = p.add(request.pfStep)) amounts.add(amount(p));
    amounts.add(amount(request.maxPfAmount));
    BigDecimal basePf = request.scenario.pfLoanAmount;
    if (basePf.compareTo(request.minPfAmount) >= 0 && basePf.compareTo(request.maxPfAmount) <= 0)
      amounts.add(amount(basePf));
    for (BigDecimal boundary : List.of(request.scenario.pfLoanLimit, request.scenario.loanAmount(), NingboPolicy.ordinaryLoanLimit(request.scenario), NingboPolicy.balanceLoanLimit(request.scenario)))
      if (boundary.compareTo(request.minPfAmount) >= 0
          && boundary.compareTo(request.maxPfAmount) <= 0) amounts.add(amount(boundary));
    Set<String> methods = new LinkedHashSet<>(request.methods);
    int total = years.size() * amounts.size() * methods.size();
    if (total > 2500) throw new IllegalArgumentException("加入边界与原方案后超过2500候选，请缩小范围");
    List<Candidate> feasible = new ArrayList<>();
    Map<String, Integer> reasons = new LinkedHashMap<>();
    for (int y : years)
      for (BigDecimal p : amounts)
        for (String method : methods) {
          String rejection = null;
          if (p.compareTo(request.scenario.loanAmount()) > 0) rejection = "公积金贷款超过总贷款";
          else if (p.signum() > 0 && !request.scenario.pfEligible) rejection = "未声明公积金贷款资格";
          else if (p.compareTo(request.scenario.pfLoanLimit) > 0) rejection = "超过用户确认的公积金贷款额度";
          if (rejection != null) {
            reasons.merge(rejection, 1, Integer::sum);
            continue;
          }
          Scenario s = request.scenario.copy();
          s.loanYears = y;
          s.pfLoanAmount = p;
          s.repaymentMethod = method;
          CalculationResult r = engine.calculate(s);
          if (!r.feasible()) {
            reasons.merge(String.join("；", r.violations()), 1, Integer::sum);
            continue;
          }
          feasible.add(new Candidate(r.input(), r.summary()));
        }
    Comparator<Candidate> comparator =
        Comparator.comparing(c -> score(c.summary(), request.objective));
    if ("CASH_FLOW".equals(request.objective)) comparator = comparator.reversed();
    comparator =
        comparator
            .thenComparing(c -> metric(c.summary(), "totalInterest"))
            .thenComparingInt(c -> c.scenario().loanYears)
            .thenComparing(c -> c.scenario().pfLoanAmount)
            .thenComparing(c -> c.scenario().repaymentMethod);
    feasible.sort(comparator);
    List<Plan> plans = new ArrayList<>();
    for (Candidate c : feasible.stream().limit(3).toList())
      plans.add(
          new Plan(
              plans.size() + 1,
              c.scenario(),
              c.summary(),
              score(c.summary(), request.objective),
              explain(c, baseline)));
    List<ParetoPoint> pareto = new ArrayList<>();
    // O(n log n) two-objective frontier: interest ascending, cash descending. Equal points
    // deduplicate.
    List<Candidate> frontierOrder = new ArrayList<>(feasible);
    frontierOrder.sort(
        Comparator.<Candidate, BigDecimal>comparing(c -> metric(c.summary(), "totalInterest"))
            .thenComparing(
                c -> metric(c.summary(), "annualDisposableCash"), Comparator.reverseOrder()));
    BigDecimal bestCash = null;
    for (Candidate c : frontierOrder) {
      BigDecimal cash = metric(c.summary(), "annualDisposableCash");
      if (bestCash == null || cash.compareTo(bestCash) > 0) {
        pareto.add(
            new ParetoPoint(
                c.scenario.loanYears,
                c.scenario.pfLoanAmount,
                c.scenario.repaymentMethod,
                cash,
                metric(c.summary, "totalInterest"),
                metric(c.summary, "presentValueCost")));
        bestCash = cash;
      }
    }
    if (pareto.size() > 60) {
      List<ParetoPoint> sample = new ArrayList<>();
      for (int i = 0; i < 60; i++)
        sample.add(pareto.get((int) Math.round(i * (pareto.size() - 1) / 59.0)));
      pareto = sample;
    }
    return new OptimizationResult(
        request.objective,
        feasible.isEmpty() ? "NO_FEASIBLE" : "SUCCESS",
        baseline,
        List.copyOf(plans),
        List.copyOf(pareto),
        total,
        feasible.size(),
        total - feasible.size(),
        Map.copyOf(reasons),
        (System.nanoTime() - start) / 1_000_000,
        "有限候选集合穷举；期限端点、金额上限/额度/总贷款边界及范围内原方案均纳入。商贷及自定义公积金利率固定，官方公积金参考档按期限适配；结果不是连续空间的全局最优。帕累托前沿按年度可支配现金和总利息生成，最多均匀展示60点。",
        Map.of("minYears", request.minYears, "maxYears", request.maxYears, "yearStep", request.yearStep,
          "minPfAmount", request.minPfAmount, "maxPfAmount", request.maxPfAmount, "pfStep", request.pfStep,
          "methods", request.methods, "objective", request.objective));
  }

  private static BigDecimal metric(Map<String, Object> s, String key) {
    return (BigDecimal) s.get(key);
  }

  private BigDecimal score(Map<String, Object> s, String objective) {
    return metric(
        s,
        switch (objective) {
          case "INTEREST" -> "totalInterest";
          case "PRESENT_VALUE" -> "presentValueCost";
          default -> "annualCashAfterMortgage";
        });
  }

  private List<String> explain(Candidate c, CalculationResult base) {
    BigDecimal delta =
        metric(c.summary, "annualDisposableCash")
            .subtract(metric(base.summary(), "annualDisposableCash"));
    BigDecimal interest =
        metric(c.summary, "totalInterest").subtract(metric(base.summary(), "totalInterest"));
    return List.of(
        "相比原方案，测算年度生活支出后现金变化 " + amount(delta) + " 元；全期总利息变化 " + amount(interest) + " 元。",
        "期限 "
            + base.input().loanYears
            + " → "
            + c.scenario.loanYears
            + " 年，公积金贷款 "
            + base.input().pfLoanAmount
            + " → "
            + c.scenario.pfLoanAmount
            + " 元。",
        "该方案满足所输入可贷额度、资格声明与逐月最低现金约束；账户余额与单位缴存不会重复计入现金。",
        "现金改善可能来自降低月供或使用既有公积金资产，不能直接等同于新增财富。");
  }
}
