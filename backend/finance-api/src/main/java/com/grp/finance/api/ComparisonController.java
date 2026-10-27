package com.grp.finance.api;

import com.grp.finance.core.*;
import com.grp.finance.core.Models.CalculationResult;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ComparisonController {
  public record Entry(String id, String name, Scenario scenario) {}
  public record Request(List<Entry> scenarios) {}
  public record Compared(String id, String name, CalculationResult calculation) {}

  @PostMapping("/compare")
  public List<Compared> compare(@RequestBody Request request) {
    if (request.scenarios() == null || request.scenarios().isEmpty() || request.scenarios().size() > 4)
      throw new IllegalArgumentException("方案比较须包含1–4个方案");
    Set<String> ids = new HashSet<>();
    List<Compared> results = new ArrayList<>();
    FinanceEngine engine = new FinanceEngine();
    for (Entry entry : request.scenarios()) {
      if (entry == null || entry.id() == null || entry.id().isBlank() || entry.id().length() > 80 || !ids.add(entry.id())
          || entry.name() == null || entry.name().isBlank() || entry.name().length() > 80
          || entry.scenario() == null) throw new IllegalArgumentException("方案名称、编号或输入无效");
      results.add(new Compared(entry.id(), entry.name(), engine.calculate(entry.scenario())));
    }
    return List.copyOf(results);
  }
}
