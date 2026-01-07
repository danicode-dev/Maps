package com.granada.guide.service;

import com.granada.guide.dto.CommonDtos.UserSummary;
import com.granada.guide.dto.PhotoDtos.PhotoResponse;
import com.granada.guide.entity.Photo;
import com.granada.guide.entity.Place;
import com.granada.guide.entity.User;
import com.granada.guide.exception.ApiException;
import com.granada.guide.repository.PhotoRepository;
import com.granada.guide.repository.PlaceRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PhotoService {
  private final PhotoRepository photoRepository;
  private final PlaceRepository placeRepository;
  private final GroupService groupService;
  private final AuthService authService;
  private final FileStorageService fileStorageService;

  public PhotoService(PhotoRepository photoRepository,
      PlaceRepository placeRepository,
      GroupService groupService,
      AuthService authService,
      FileStorageService fileStorageService) {
    this.photoRepository = photoRepository;
    this.placeRepository = placeRepository;
    this.groupService = groupService;
    this.authService = authService;
    this.fileStorageService = fileStorageService;
  }

  @Transactional(readOnly = true)
  public List<PhotoResponse> list(Long userId, Long placeId) {
    Place place = getPlaceForMember(placeId, userId);
    return photoRepository.findByPlace_IdAndHiddenFalseOrderByCreatedAtAsc(place.getId())
        .stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  @Transactional
  public PhotoResponse upload(Long userId, Long placeId, MultipartFile file, String caption) {
    Place place = getPlaceForMember(placeId, userId);
    User user = authService.getUserOrThrow(userId);
    String url = fileStorageService.storePlacePhoto(placeId, file);
    Photo photo = new Photo();
    photo.setPlace(place);
    photo.setUser(user);
    photo.setUrl(url);
    photo.setCaption(caption);
    Photo saved = photoRepository.save(photo);
    return toResponse(saved);
  }

  private Place getPlaceForMember(Long placeId, Long userId) {
    Place place = placeRepository.findById(placeId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Place not found"));
    groupService.getGroupForMember(place.getGroup().getId(), userId);
    return place;
  }

  private PhotoResponse toResponse(Photo photo) {
    UserSummary user = new UserSummary(photo.getUser().getId(), photo.getUser().getName());
    return new PhotoResponse(photo.getId(), user, photo.getUrl(), photo.getCaption(),
        photo.getCreatedAt());
  }
}
