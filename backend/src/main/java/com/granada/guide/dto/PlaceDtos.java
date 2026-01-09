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
      @NotBlank @Size(max = 200) String name,
      @NotNull Double lat,
      @NotNull Double lng,
      @NotNull PlaceVisitStatus status,
      @Size(max = 2000) String notes,
      @Size(max = 255) String address,
      Long categoryId
  ) {}

  public record UpdatePlaceRequest(
      @Size(max = 200) String name,
      @Size(max = 2000) String notes,
      @Size(max = 255) String address,
      PlaceVisitStatus status,
      Instant visitedAt,
      Long categoryId
  ) {}

  public record PlaceResponse(
      Long id,
      Long groupId,
      String name,
      Double lat,
      Double lng,
      PlaceVisitStatus status,
      String notes,
      String address,
      CategorySummary category,
      UserSummary createdBy,
      Instant createdAt,
      Instant visitedAt
  ) {}
}
