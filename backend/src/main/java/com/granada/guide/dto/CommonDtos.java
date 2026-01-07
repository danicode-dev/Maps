package com.granada.guide.dto;

public class CommonDtos {
  public record UserSummary(Long id, String name) {}

  public record CategorySummary(Long id, String name, String icon) {}
}
