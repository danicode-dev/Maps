package com.granada.guide.service;

import com.granada.guide.dto.CommonDtos.CategorySummary;
import com.granada.guide.dto.CommonDtos.UserSummary;
import com.granada.guide.dto.PlaceDtos.CreatePlaceRequest;
import com.granada.guide.dto.PlaceDtos.PlaceResponse;
import com.granada.guide.dto.PlaceDtos.UpdatePlaceRequest;
import com.granada.guide.dto.PlaceDtos.UpdateStatusRequest;
import com.granada.guide.entity.Category;
import com.granada.guide.entity.Group;
import com.granada.guide.entity.GroupMember;
import com.granada.guide.entity.Place;
import com.granada.guide.entity.PlaceStatus;
import com.granada.guide.entity.PlaceStatusId;
import com.granada.guide.entity.PlaceVisitStatus;
import com.granada.guide.entity.User;
import com.granada.guide.exception.ApiException;
import com.granada.guide.repository.CategoryRepository;
import com.granada.guide.repository.GroupMemberRepository;
import com.granada.guide.repository.PlaceRepository;
import com.granada.guide.repository.PlaceStatusRepository;
import com.granada.guide.util.GeoUtils;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class PlaceService {
  private final PlaceRepository placeRepository;
  private final CategoryRepository categoryRepository;
  private final GroupMemberRepository groupMemberRepository;
  private final PlaceStatusRepository placeStatusRepository;
  private final GroupService groupService;
  private final AuthService authService;

  public PlaceService(PlaceRepository placeRepository,
      CategoryRepository categoryRepository,
      GroupMemberRepository groupMemberRepository,
      PlaceStatusRepository placeStatusRepository,
      GroupService groupService,
      AuthService authService) {
    this.placeRepository = placeRepository;
    this.categoryRepository = categoryRepository;
    this.groupMemberRepository = groupMemberRepository;
    this.placeStatusRepository = placeStatusRepository;
    this.groupService = groupService;
    this.authService = authService;
  }

  @Transactional
  public PlaceResponse createPlace(Long userId, CreatePlaceRequest request) {
    Group group = groupService.getGroupForMember(request.groupId(), userId);
    User user = authService.getUserOrThrow(userId);
    Category category = categoryRepository.findById(request.categoryId())
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));

    Place place = new Place();
    place.setGroup(group);
    place.setName(request.name());
    place.setDescription(request.description());
    place.setCategory(category);
    place.setLat(request.lat());
    place.setLng(request.lng());
    place.setAddress(request.address());
    place.setCreatedBy(user);
    Place saved = placeRepository.save(place);

    List<GroupMember> members = groupMemberRepository.findByGroup_Id(group.getId());
    List<PlaceStatus> statuses = new ArrayList<>();
    for (GroupMember member : members) {
      PlaceStatus status = new PlaceStatus();
      status.setPlace(saved);
      status.setUser(member.getUser());
      status.setStatus(PlaceVisitStatus.PENDING);
      status.setId(new PlaceStatusId(saved.getId(), member.getUser().getId()));
      statuses.add(status);
    }
    placeStatusRepository.saveAll(statuses);

    PlaceStatus selfStatus = statuses.stream()
        .filter(ps -> ps.getUser().getId().equals(userId))
        .findFirst()
        .orElse(null);
    return toResponse(saved, selfStatus);
  }

  @Transactional(readOnly = true)
  public Page<PlaceResponse> listPlaces(Long userId, String statusValue, Long categoryId,
      String query, Pageable pageable) {
    List<Long> groupIds = groupService.getGroupIdsForUser(userId);
    if (groupIds.isEmpty()) {
      return Page.empty(pageable);
    }
    PlaceVisitStatus statusFilter = parseStatus(statusValue);

    var spec = PlaceSpecifications.belongsToGroups(groupIds);
    if (categoryId != null) {
      spec = spec.and(PlaceSpecifications.hasCategory(categoryId));
    }
    if (StringUtils.hasText(query)) {
      spec = spec.and(PlaceSpecifications.matchesQuery(query));
    }
    if (statusFilter != null) {
      spec = spec.and(PlaceSpecifications.hasStatusForUser(userId, statusFilter));
    }
    Page<Place> page = placeRepository.findAll(spec, pageable);
    List<Long> placeIds = page.getContent().stream().map(Place::getId).toList();
    Map<Long, PlaceStatus> statusMap = placeIds.isEmpty()
        ? Map.of()
        : placeStatusRepository.findByUser_IdAndPlace_IdIn(userId, placeIds)
            .stream()
            .collect(Collectors.toMap(ps -> ps.getPlace().getId(), ps -> ps));
    List<PlaceResponse> responses = page.getContent().stream()
        .map(place -> toResponse(place, statusMap.get(place.getId())))
        .toList();
    return new PageImpl<>(responses, pageable, page.getTotalElements());
  }

  @Transactional(readOnly = true)
  public PlaceResponse getPlace(Long userId, Long placeId) {
    Place place = getPlaceForMember(placeId, userId);
    PlaceStatus status = placeStatusRepository.findByPlace_IdAndUser_Id(placeId, userId).orElse(null);
    return toResponse(place, status);
  }

  @Transactional
  public PlaceResponse updatePlace(Long userId, Long placeId, UpdatePlaceRequest request) {
    Place place = getPlaceForMember(placeId, userId);
    if (StringUtils.hasText(request.name())) {
      place.setName(request.name());
    }
    if (request.description() != null) {
      place.setDescription(request.description());
    }
    if (request.categoryId() != null) {
      Category category = categoryRepository.findById(request.categoryId())
          .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
      place.setCategory(category);
    }
    if (request.lat() != null) {
      place.setLat(request.lat());
    }
    if (request.lng() != null) {
      place.setLng(request.lng());
    }
    if (request.address() != null) {
      place.setAddress(request.address());
    }
    Place saved = placeRepository.save(place);
    PlaceStatus status = placeStatusRepository.findByPlace_IdAndUser_Id(placeId, userId).orElse(null);
    return toResponse(saved, status);
  }

  @Transactional
  public void deletePlace(Long userId, Long placeId) {
    Place place = getPlaceForMember(placeId, userId);
    placeRepository.delete(place);
  }

  @Transactional
  public PlaceResponse updateStatus(Long userId, Long placeId, UpdateStatusRequest request) {
    Place place = getPlaceForMember(placeId, userId);
    PlaceStatus status = placeStatusRepository.findByPlace_IdAndUser_Id(placeId, userId)
        .orElseGet(() -> {
          PlaceStatus created = new PlaceStatus();
          created.setPlace(place);
          created.setUser(authService.getUserOrThrow(userId));
          created.setId(new PlaceStatusId(place.getId(), userId));
          return created;
        });
    status.setStatus(request.status());
    status.setFavorite(request.isFavorite());
    status.setUpdatedAt(Instant.now());
    PlaceStatus saved = placeStatusRepository.save(status);
    return toResponse(place, saved);
  }

  @Transactional(readOnly = true)
  public List<PlaceResponse> nearby(Long userId, double lat, double lng, double radiusMeters,
      String statusValue, Long categoryId) {
    List<Long> groupIds = groupService.getGroupIdsForUser(userId);
    if (groupIds.isEmpty()) {
      return List.of();
    }
    PlaceVisitStatus statusFilter = parseStatus(statusValue);

    var box = GeoUtils.boundingBox(lat, lng, radiusMeters);
    List<Place> candidates = placeRepository.findByGroup_IdInAndLatBetweenAndLngBetween(
        groupIds, box.minLat(), box.maxLat(), box.minLng(), box.maxLng());
    List<Long> placeIds = candidates.stream().map(Place::getId).toList();
    Map<Long, PlaceStatus> statusMap = placeIds.isEmpty()
        ? Map.of()
        : placeStatusRepository.findByUser_IdAndPlace_IdIn(userId, placeIds)
            .stream()
            .collect(Collectors.toMap(ps -> ps.getPlace().getId(), ps -> ps));
    return candidates.stream()
        .filter(place -> categoryId == null || (place.getCategory() != null
            && place.getCategory().getId().equals(categoryId)))
        .filter(place -> {
          PlaceStatus status = statusMap.get(place.getId());
          return statusFilter == null || (status != null && status.getStatus() == statusFilter);
        })
        .map(place -> {
          double distance = GeoUtils.distanceMeters(lat, lng, place.getLat(), place.getLng());
          return new PlaceDistance(place, statusMap.get(place.getId()), distance);
        })
        .filter(item -> item.distanceMeters <= radiusMeters)
        .sorted(Comparator.comparingDouble(item -> item.distanceMeters))
        .map(item -> toResponse(item.place, item.status))
        .toList();
  }

  private Place getPlaceForMember(Long placeId, Long userId) {
    Place place = placeRepository.findById(placeId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Place not found"));
    groupService.getGroupForMember(place.getGroup().getId(), userId);
    return place;
  }

  private PlaceResponse toResponse(Place place, PlaceStatus status) {
    CategorySummary category = null;
    if (place.getCategory() != null) {
      category = new CategorySummary(place.getCategory().getId(),
          place.getCategory().getName(),
          place.getCategory().getIcon());
    }
    UserSummary createdBy = new UserSummary(
        place.getCreatedBy().getId(),
        place.getCreatedBy().getName());
    PlaceVisitStatus visitStatus = status != null ? status.getStatus() : PlaceVisitStatus.PENDING;
    boolean favorite = status != null && status.isFavorite();
    return new PlaceResponse(
        place.getId(),
        place.getGroup().getId(),
        place.getName(),
        place.getDescription(),
        category,
        place.getLat(),
        place.getLng(),
        place.getAddress(),
        createdBy,
        place.getCreatedAt(),
        visitStatus,
        favorite
    );
  }

  private static class PlaceDistance {
    private final Place place;
    private final PlaceStatus status;
    private final double distanceMeters;

    private PlaceDistance(Place place, PlaceStatus status, double distanceMeters) {
      this.place = place;
      this.status = status;
      this.distanceMeters = distanceMeters;
    }
  }

  private PlaceVisitStatus parseStatus(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    try {
      return PlaceVisitStatus.valueOf(value.toUpperCase());
    } catch (IllegalArgumentException ex) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid status value");
    }
  }
}
