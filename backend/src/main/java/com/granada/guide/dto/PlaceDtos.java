package com.granada.guide.dto;

import com.granada.guide.entity.PlaceVisitStatus;
import com.granada.guide.dto.CommonDtos.CategorySummary;
import com.granada.guide.dto.CommonDtos.UserSummary;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public class PlaceDtos {
  public record CreatePlaceRequest(
      @NotNull Long groupId,
      @NotBlank @Size(max = 200) String name,
      String description,
      @NotNull Long categoryId,
      @NotNull Double lat,
      @NotNull Double lng,
      String address
  ) {}

  public record UpdatePlaceRequest(
      @Size(max = 200) String name,
      String description,
      Long categoryId,
      Double lat,
      Double lng,
      String address
  ) {}

  public record PlaceResponse(
      Long id,
      Long groupId,
      String name,
      String description,
      CategorySummary category,
      Double lat,
      Double lng,
      String address,
      UserSummary createdBy,
      Instant createdAt,
      PlaceVisitStatus status,
      boolean favorite
  ) {}

  public record UpdateStatusRequest(
      @NotNull PlaceVisitStatus status,
      boolean isFavorite
  ) {}
}
