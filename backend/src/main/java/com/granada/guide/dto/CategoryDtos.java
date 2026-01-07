package com.granada.guide.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CategoryDtos {
  public record CategoryResponse(Long id, String name, String icon) {}

  public record CreateCategoryRequest(
      @NotBlank @Size(max = 80) String name,
      @Size(max = 120) String icon
  ) {}
}
