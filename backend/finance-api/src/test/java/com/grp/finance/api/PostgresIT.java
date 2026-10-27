package com.grp.finance.api;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(properties = "spring.profiles.active=postgres")
class PostgresIT {
  @Container
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

  @DynamicPropertySource
  static void database(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  @Autowired PolicyRepository repository;

  @Test
  void migrationAndPolicyPersistenceUseRealPostgres() {
    assertEquals(3, repository.count());
    String current = repository.findById("current").orElseThrow().content;
    assertTrue(current.contains("NINGBO"));
    assertEquals(current, repository.findById(com.grp.finance.core.FinanceEngine.POLICY).orElseThrow().content);
    assertTrue(repository.findById("examples").isPresent());
  }
}
