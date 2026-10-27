package com.grp.finance.api;

import jakarta.persistence.*;

@Entity
@Table(name = "policy_document")
public class PolicyDocument {
  @Id public String id;

  @Column(nullable = false)
  public String kind;

  @Column(nullable = false, columnDefinition = "TEXT")
  public String content;

  protected PolicyDocument() {}

  public PolicyDocument(String id, String kind, String content) {
    this.id = id;
    this.kind = kind;
    this.content = content;
  }
}
