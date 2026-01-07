package com.granada.guide.controller;

import com.granada.guide.dto.PlaceDtos.CreatePlaceRequest;
import com.granada.guide.dto.PlaceDtos.PlaceResponse;
import com.granada.guide.dto.PlaceDtos.UpdatePlaceRequest;
import com.granada.guide.dto.PlaceDtos.UpdateStatusRequest;
import com.granada.guide.security.UserPrincipal;
import com.granada.guide.service.PlaceService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/places")
public class PlaceController {
  private final PlaceService placeService;

  public PlaceController(PlaceService placeService) {
    this.placeService = placeService;
  }

  @PostMapping
  public PlaceResponse create(@AuthenticationPrincipal UserPrincipal principal,
      @Valid @RequestBody CreatePlaceRequest request) {
    return placeService.createPlace(principal.getId(), request);
  }

  @GetMapping
  public Page<PlaceResponse> list(@AuthenticationPrincipal UserPrincipal principal,
      @RequestParam(value = "status", required = false) String status,
      @RequestParam(value = "categoryId", required = false) Long categoryId,
      @RequestParam(value = "q", required = false) String query,
      @PageableDefault(size = 20) Pageable pageable) {
    return placeService.listPlaces(principal.getId(), status, categoryId, query, pageable);
  }

  @GetMapping("/nearby")
  public List<PlaceResponse> nearby(@AuthenticationPrincipal UserPrincipal principal,
      @RequestParam("lat") double lat,
      @RequestParam("lng") double lng,
      @RequestParam(value = "radiusMeters", defaultValue = "2000") double radiusMeters,
      @RequestParam(value = "status", required = false) String status,
      @RequestParam(value = "categoryId", required = false) Long categoryId) {
    return placeService.nearby(principal.getId(), lat, lng, radiusMeters, status, categoryId);
  }

  @GetMapping("/{id}")
  public PlaceResponse get(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("id") Long placeId) {
    return placeService.getPlace(principal.getId(), placeId);
  }

  @PatchMapping("/{id}")
  public PlaceResponse update(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("id") Long placeId,
      @Valid @RequestBody UpdatePlaceRequest request) {
    return placeService.updatePlace(principal.getId(), placeId, request);
  }

  @DeleteMapping("/{id}")
  public void delete(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("id") Long placeId) {
    placeService.deletePlace(principal.getId(), placeId);
  }

  @PutMapping("/{id}/status")
  public PlaceResponse updateStatus(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("id") Long placeId,
      @Valid @RequestBody UpdateStatusRequest request) {
    return placeService.updateStatus(principal.getId(), placeId, request);
  }
}
