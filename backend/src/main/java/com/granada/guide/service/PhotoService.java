package com.granada.guide.service;

import com.granada.guide.dto.CommonDtos.UserSummary;
import com.granada.guide.dto.PhotoDtos.PhotoResponse;
import com.granada.guide.entity.Photo;
import com.granada.guide.entity.Place;
import com.granada.guide.entity.User;
import com.granada.guide.exception.ApiException;
import com.granada.guide.repository.PhotoRepository;
import com.granada.guide.repository.PlaceRepository;
import java.nio.file.Path;
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

  @Transactional
  public void delete(Long userId, Long photoId) {
    Photo photo = photoRepository.findById(photoId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Foto no encontrada"));
    groupService.getGroupForMember(photo.getPlace().getGroup().getId(), userId);
    photoRepository.delete(photo);
  }

  @Transactional(readOnly = true)
  public PhotoFile loadFile(Long userId, Long photoId) {
    Photo photo = photoRepository.findById(photoId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Foto no encontrada"));
    groupService.getGroupForMember(photo.getPlace().getGroup().getId(), userId);
    Path path = fileStorageService.resolvePath(photo.getUrl());
    return new PhotoFile(fileStorageService.loadAsResource(path),
        fileStorageService.detectContentType(path));
  }

  private Place getPlaceForMember(Long placeId, Long userId) {
    Place place = placeRepository.findById(placeId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Sitio no encontrado"));
    groupService.getGroupForMember(place.getGroup().getId(), userId);
    return place;
  }

  private PhotoResponse toResponse(Photo photo) {
    UserSummary user = new UserSummary(photo.getUser().getId(), photo.getUser().getName());
    String fileUrl = "/api/photos/" + photo.getId() + "/file";
    return new PhotoResponse(photo.getId(), user, fileUrl, photo.getCaption(), photo.getCreatedAt());
  }
}
