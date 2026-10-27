package com.grp.finance.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.grp.finance.core.*;
import java.util.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class PolicySeed implements CommandLineRunner {
  private final PolicyRepository repository;
  private final ObjectMapper mapper;

  public PolicySeed(PolicyRepository r, ObjectMapper m) {
    repository = r;
    mapper = m;
  }

  @Override
  @Transactional
  public void run(String... args) throws Exception {
    Map<String, Object> policy;
    try (var source = getClass().getResourceAsStream("/policies/ningbo-2026.json")) {
      if (source == null) throw new IllegalStateException("Missing bundled Ningbo policy register");
      policy = mapper.readValue(source, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
    }
    policy.put("version", FinanceEngine.POLICY);
    policy.put("assumptions", FinanceEngine.assumptions());
    policy.put("districts", NingboPolicy.DISTRICTS);
    policy.put("rules", Map.of(
        "monthlyBasicDeduction", "5000", "mortgageMonthlyDeduction", "1000",
        "mortgageDeductionMaxMonths", 240, "pfRateRange", "5%–12%",
        "firstHomeFirstLoanLimit", NingboPolicy.FIRST_HOME_FIRST_LOAN_LIMIT,
        "otherOrdinaryLimit", NingboPolicy.OTHER_ORDINARY_LIMIT,
        "balanceMultiplier", NingboPolicy.BALANCE_MULTIPLIER,
        "balanceFloor", NingboPolicy.BALANCE_FLOOR,
        "provisionalPfBaseCeiling", "38907", "supportedTermYears", "1–30"));
    repository.save(new PolicyDocument(FinanceEngine.POLICY, "POLICY", mapper.writeValueAsString(policy)));
    repository.save(new PolicyDocument("current", "POLICY", mapper.writeValueAsString(policy)));
    Scenario standard = new Scenario();
    Scenario budget = new Scenario();
    budget.monthlySalary = Money.d("18000");
    budget.annualBonus = Money.d("24000");
    budget.socialInsuranceBase = Money.d("18000");
    budget.confirmedMonthlySocial = Money.d("1890");
    budget.pfBase = Money.d("18000");
    budget.housePrice = Money.d("2000000");
    budget.pfLoanAmount = Money.d("800000");
    budget.pfBalance = Money.d("50000");
    budget.monthlyLivingCost = Money.d("5000");
    Scenario pure = standard.copy();
    pure.pfLoanAmount = Money.ZERO;
    pure.providentUsage = "NONE";
    repository.save(
        new PolicyDocument(
            "examples",
            "DEMO",
            mapper.writeValueAsString(
                List.of(
                    Map.of(
                        "id",
                        "balanced",
                        "name",
                        "宁波组合贷款示例",
                        "description",
                        "税前月薪3万元、年终奖6万元，300万元房屋。虚构数据，用于演示完整流程。",
                        "scenario",
                        standard),
                    Map.of(
                        "id",
                        "starter",
                        "name",
                        "宁波首次购房示例",
                        "description",
                        "月薪1.8万元、200万元房屋，关注月度偿付压力。",
                        "scenario",
                        budget),
                    Map.of(
                        "id",
                        "commercial",
                        "name",
                        "纯商业贷款示例",
                        "description",
                        "不使用公积金贷款与冲还贷，比较融资结构的影响。",
                        "scenario",
                        pure)))));
  }

  private Map<String, String> ref(String title, String url, String note) {
    return Map.of("title", title, "url", url, "note", note);
  }
}
