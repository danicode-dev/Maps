package com.granada.guide.service;

import com.granada.guide.dto.CategoryDtos.CategoryResponse;
import com.granada.guide.dto.CategoryDtos.CreateCategoryRequest;
import com.granada.guide.entity.Category;
import com.granada.guide.exception.ApiException;
import com.granada.guide.repository.CategoryRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {
  private final CategoryRepository categoryRepository;
  private final GroupService groupService;

  public CategoryService(CategoryRepository categoryRepository, GroupService groupService) {
    this.categoryRepository = categoryRepository;
    this.groupService = groupService;
  }

  public List<CategoryResponse> list() {
    return categoryRepository.findAll().stream()
        .map(cat -> new CategoryResponse(cat.getId(), cat.getName(), cat.getIcon()))
        .collect(Collectors.toList());
  }

  public CategoryResponse create(Long userId, CreateCategoryRequest request) {
    if (!groupService.isOwnerAnywhere(userId)) {
      throw new ApiException(HttpStatus.FORBIDDEN,
          "Se requiere ser propietario para crear categorias");
    }
    Category category = new Category();
    category.setName(request.name());
    category.setIcon(request.icon());
    Category saved = categoryRepository.save(category);
    return new CategoryResponse(saved.getId(), saved.getName(), saved.getIcon());
  }
}
