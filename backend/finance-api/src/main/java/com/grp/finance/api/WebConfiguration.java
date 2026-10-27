package com.grp.finance.api;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Optional exact-origin CORS for separately hosted frontends. Same-origin is the default. */
@Configuration
public class WebConfiguration implements WebMvcConfigurer {
  @Value("${homewise.allowed-origins:}") private String allowedOrigins;
  @Override public void addCorsMappings(CorsRegistry registry) {
    String[] origins = Arrays.stream(allowedOrigins.split(",")).map(String::trim)
        .filter(value -> !value.isEmpty()).toArray(String[]::new);
    if (origins.length > 0) registry.addMapping("/api/**").allowedOrigins(origins)
        .allowedMethods("GET", "POST").allowedHeaders("Content-Type").allowCredentials(false).maxAge(3600);
  }
}
