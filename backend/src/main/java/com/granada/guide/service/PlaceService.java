package com.granada.guide.service;

import com.granada.guide.dto.CommonDtos.CategorySummary;
import com.granada.guide.dto.CommonDtos.UserSummary;
import com.granada.guide.dto.PlaceDtos.CreatePlaceRequest;
import com.granada.guide.dto.PlaceDtos.PlaceResponse;
import com.granada.guide.dto.PlaceDtos.UpdatePlaceRequest;
import com.granada.guide.entity.Group;
import com.granada.guide.entity.Category;
import com.granada.guide.entity.Place;
import com.granada.guide.entity.PlaceVisitStatus;
import com.granada.guide.entity.User;
import com.granada.guide.exception.ApiException;
import com.granada.guide.repository.CategoryRepository;
import com.granada.guide.repository.PlaceRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class PlaceService {
  private final PlaceRepository placeRepository;
  private final CategoryRepository categoryRepository;
  private final GroupService groupService;
  private final AuthService authService;

  public PlaceService(PlaceRepository placeRepository,
      CategoryRepository categoryRepository,
      GroupService groupService,
      AuthService authService) {
    this.placeRepository = placeRepository;
    this.categoryRepository = categoryRepository;
    this.groupService = groupService;
    this.authService = authService;
  }

  @Transactional
  public PlaceResponse createPlace(Long userId, CreatePlaceRequest request) {
    User user = authService.getUserOrThrow(userId);
    Group group = groupService.getOrCreateDefaultGroupForUser(user);

    Place place = new Place();
    place.setGroup(group);
    place.setName(request.name());
    place.setNotes(request.notes());
    place.setAddress(request.address());
    place.setLat(request.lat());
    place.setLng(request.lng());
    place.setStatus(request.status());
    place.setVisitedAt(request.status() == PlaceVisitStatus.VISITED ? Instant.now() : null);
    if (request.categoryId() != null) {
      place.setCategory(getCategoryOrThrow(request.categoryId()));
    }
    place.setCreatedBy(user);
    Place saved = placeRepository.save(place);
    return toResponse(saved);
  }

  @Transactional(readOnly = true)
  public List<PlaceResponse> listPlaces(Long userId, String bboxValue, String statusValue) {
    List<Long> groupIds = groupService.getGroupIdsForUser(userId);
    if (groupIds.isEmpty()) {
      return List.of();
    }
    PlaceVisitStatus statusFilter = parseStatus(statusValue);
    BoundingBox bbox = parseBoundingBox(bboxValue);
    List<Place> places = bbox == null
        ? placeRepository.findByGroup_IdIn(groupIds)
        : placeRepository.findByGroup_IdInAndLatBetweenAndLngBetween(
            groupIds, bbox.minLat, bbox.maxLat, bbox.minLng, bbox.maxLng);
    return places.stream()
        .filter(place -> statusFilter == null || place.getStatus() == statusFilter)
        .map(this::toResponse)
        .toList();
  }

  @Transactional(readOnly = true)
  public PlaceResponse getPlace(Long userId, Long placeId) {
    Place place = getPlaceForMember(placeId, userId);
    return toResponse(place);
  }

  @Transactional
  public PlaceResponse updatePlace(Long userId, Long placeId, UpdatePlaceRequest request) {
    Place place = getPlaceForMember(placeId, userId);
    if (StringUtils.hasText(request.name())) {
      place.setName(request.name());
    }
    if (request.notes() != null) {
      place.setNotes(request.notes());
    }
    if (request.address() != null) {
      place.setAddress(request.address());
    }
    if (request.status() != null) {
      place.setStatus(request.status());
      if (request.status() == PlaceVisitStatus.VISITED) {
        place.setVisitedAt(request.visitedAt() != null ? request.visitedAt() : Instant.now());
      } else {
        place.setVisitedAt(null);
      }
    } else if (request.visitedAt() != null) {
      place.setVisitedAt(request.visitedAt());
    }
    if (request.categoryId() != null) {
      place.setCategory(getCategoryOrThrow(request.categoryId()));
    }
    Place saved = placeRepository.save(place);
    return toResponse(saved);
  }

  @Transactional
  public void deletePlace(Long userId, Long placeId) {
    Place place = getPlaceForMember(placeId, userId);
    placeRepository.delete(place);
  }

  private Place getPlaceForMember(Long placeId, Long userId) {
    Place place = placeRepository.findById(placeId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Sitio no encontrado"));
    groupService.getGroupForMember(place.getGroup().getId(), userId);
    return place;
  }

  private PlaceResponse toResponse(Place place) {
    UserSummary createdBy = new UserSummary(
        place.getCreatedBy().getId(),
        place.getCreatedBy().getName());
    CategorySummary category = place.getCategory() != null
        ? new CategorySummary(
            place.getCategory().getId(),
            place.getCategory().getName(),
            place.getCategory().getIcon())
        : null;
    return new PlaceResponse(
        place.getId(),
        place.getGroup().getId(),
        place.getName(),
        place.getLat(),
        place.getLng(),
        place.getStatus(),
        place.getNotes(),
        place.getAddress(),
        category,
        createdBy,
        place.getCreatedAt(),
        place.getVisitedAt()
    );
  }

  private PlaceVisitStatus parseStatus(String value) {
    if (!StringUtils.hasText(value) || value.equalsIgnoreCase("ALL")) {
      return null;
    }
    try {
      return PlaceVisitStatus.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Estado invalido");
    }
  }

  private BoundingBox parseBoundingBox(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    String[] parts = value.split(",");
    if (parts.length != 4) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Formato de bbox invalido");
    }
    try {
      double minLng = Double.parseDouble(parts[0]);
      double minLat = Double.parseDouble(parts[1]);
      double maxLng = Double.parseDouble(parts[2]);
      double maxLat = Double.parseDouble(parts[3]);
      return new BoundingBox(minLat, maxLat, minLng, maxLng);
    } catch (NumberFormatException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Valores de bbox invalidos");
    }
  }

  private Category getCategoryOrThrow(Long categoryId) {
    return categoryRepository.findById(categoryId)
        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Categoria no encontrada"));
  }

  private static class BoundingBox {
    private final double minLat;
    private final double maxLat;
    private final double minLng;
    private final double maxLng;

    private BoundingBox(double minLat, double maxLat, double minLng, double maxLng) {
      this.minLat = minLat;
      this.maxLat = maxLat;
      this.minLng = minLng;
      this.maxLng = maxLng;
    }
  }
}
