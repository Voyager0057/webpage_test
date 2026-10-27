package com.grp.finance.api;

import java.util.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, Object>> invalid(IllegalArgumentException e) {
    return ResponseEntity.badRequest()
        .body(Map.of("error", "输入或搜索范围无效", "details", List.of(e.getMessage())));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, Object>> malformed() {
    return ResponseEntity.badRequest()
        .body(Map.of("error", "请求格式错误", "details", List.of("请检查数字、字段名和JSON格式。")));
  }
}
