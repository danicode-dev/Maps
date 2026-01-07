package com.granada.guide.controller;

import com.granada.guide.dto.CategoryDtos.CategoryResponse;
import com.granada.guide.dto.CategoryDtos.CreateCategoryRequest;
import com.granada.guide.security.UserPrincipal;
import com.granada.guide.service.CategoryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {
  private final CategoryService categoryService;

  public CategoryController(CategoryService categoryService) {
    this.categoryService = categoryService;
  }

  @GetMapping
  public List<CategoryResponse> list() {
    return categoryService.list();
  }

  @PostMapping
  public CategoryResponse create(@AuthenticationPrincipal UserPrincipal principal,
      @Valid @RequestBody CreateCategoryRequest request) {
    return categoryService.create(principal.getId(), request);
  }
}
