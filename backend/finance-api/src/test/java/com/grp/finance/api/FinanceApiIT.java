package com.grp.finance.api;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "spring.datasource.url=jdbc:h2:mem:api-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
      "homewise.allowed-origins=https://example.test"
    })
class FinanceApiIT {
  @Autowired TestRestTemplate http;
  @Autowired ObjectMapper mapper;

  private ResponseEntity<JsonNode> post(String route, String json) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    return http.postForEntity("/api/" + route, new HttpEntity<>(json, headers), JsonNode.class);
  }

  @Test
  void healthPoliciesExamplesAndFlywayDatabase() {
    assertEquals("UP", http.getForObject("/api/health", JsonNode.class).path("status").asText());
    assertTrue(http.getForObject("/api/policies", JsonNode.class).path("references").size() >= 6);
    assertEquals(3, http.getForObject("/api/examples", JsonNode.class).size());
    var policy = http.getForObject("/api/policies", JsonNode.class);
    assertEquals("NINGBO", policy.path("city").asText());
    assertEquals(10, policy.path("districts").size());
    assertEquals("1600000", policy.path("rules").path("firstHomeFirstLoanLimit").asText());
  }

  @Test
  void separateFrontendCorsAllowsOnlyConfiguredOrigin() {
    HttpHeaders headers = new HttpHeaders();
    headers.setOrigin("https://example.test");
    headers.setAccessControlRequestMethod(HttpMethod.POST);
    var allowed = http.exchange("/api/calculate", HttpMethod.OPTIONS, new HttpEntity<>(headers), String.class);
    assertEquals("https://example.test", allowed.getHeaders().getAccessControlAllowOrigin());
    headers.setOrigin("https://untrusted.test");
    var denied = http.exchange("/api/calculate", HttpMethod.OPTIONS, new HttpEntity<>(headers), String.class);
    assertEquals(HttpStatus.FORBIDDEN, denied.getStatusCode());
  }

  @Test
  void calculateReturnsExactStringsAndLedgers() {
    var response = post("calculate", "{}");
    assertEquals(HttpStatus.OK, response.getStatusCode());
    JsonNode body = response.getBody();
    assertNotNull(body);
    assertTrue(body.path("summary").path("annualTax").isTextual());
    assertEquals("33870.00", body.path("summary").path("annualTax").asText());
    assertEquals(12, body.path("monthly").size());
    assertEquals(360, body.path("schedule").size());
  }

  @Test
  void rejectsInvalidAndUnknownInputs() {
    assertEquals(HttpStatus.BAD_REQUEST, post("calculate", "{\"loanYears\":31}").getStatusCode());
    assertEquals(
        HttpStatus.BAD_REQUEST, post("calculate", "{\"monthlySalary\":null}").getStatusCode());
    assertEquals(HttpStatus.BAD_REQUEST, post("calculate", "{\"unknownField\":1}").getStatusCode());
  }

  @Test
  void optimizationAndSensitivityWorkOverHttp() {
    var response =
        post(
            "optimize",
            "{\"minYears\":30,\"maxYears\":30,\"minPfAmount\":\"1000000\",\"maxPfAmount\":\"1000000\"}");
    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals(2, response.getBody().path("evaluatedCount").asInt());
    var sensitivity =
        post(
            "sensitivity",
            "{\"parameter\":\"commercialAnnualRate\",\"values\":[\"0.02\",\"0.04\"]}");
    assertEquals(HttpStatus.OK, sensitivity.getStatusCode());
    assertEquals(2, sensitivity.getBody().path("points").size());
  }

  @Test
  void comparesIndependentPlansAndRejectsDuplicateIds() {
    var response = post("compare", """
      {"scenarios":[
        {"id":"original","name":"Original","scenario":{}},
        {"id":"short","name":"Shorter term","scenario":{"loanYears":20}}
      ]}
      """);
    assertEquals(HttpStatus.OK, response.getStatusCode());
    assertEquals(2, response.getBody().size());
    var first = response.getBody().get(0).path("calculation");
    var second = response.getBody().get(1).path("calculation");
    assertEquals(first.path("summary").path("annualGrossIncome"), second.path("summary").path("annualGrossIncome"));
    assertEquals(360, first.path("schedule").size());
    assertEquals(240, second.path("schedule").size());
    assertEquals(HttpStatus.BAD_REQUEST, post("compare", "{\"scenarios\":[]}").getStatusCode());
    assertEquals(HttpStatus.BAD_REQUEST, post("compare", """
      {"scenarios":[{"id":" ","name":"A","scenario":{}}]}
      """).getStatusCode());
    assertEquals(HttpStatus.BAD_REQUEST, post("compare", """
      {"scenarios":[{"id":"same","name":"A","scenario":{}},{"id":"same","name":"B","scenario":{}}]}
      """).getStatusCode());
  }

  @Test
  void salaryStructureComparisonPreservesAnnualGrossAndRecordsActualInputs() {
    var response = post("scenario-changes", """
      {"parameter":"bonusShare","values":["0","0.1","0.2"],"scenario":{"monthlySalary":"30000.01","monthlyPerformance":"123.45"}}
      """);
    assertEquals(HttpStatus.OK, response.getStatusCode());
    for (var point : response.getBody().path("points")) {
      assertEquals("421481.52", point.path("annualGrossIncome").asText());
      assertEquals("NINGBO", point.path("scenario").path("city").asText());
    }
    assertEquals(HttpStatus.BAD_REQUEST, post("scenario-changes", "{\"parameter\":\"bonusShare\",\"values\":[\"0.6\"]}").getStatusCode());
  }
}
