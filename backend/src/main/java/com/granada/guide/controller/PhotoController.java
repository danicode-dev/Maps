package com.granada.guide.controller;

import com.granada.guide.dto.PhotoDtos.PhotoResponse;
import com.granada.guide.security.UserPrincipal;
import com.granada.guide.service.PhotoService;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/places/{placeId}/photos")
public class PhotoController {
  private final PhotoService photoService;

  public PhotoController(PhotoService photoService) {
    this.photoService = photoService;
  }

  @GetMapping
  public List<PhotoResponse> list(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long placeId) {
    return photoService.list(principal.getId(), placeId);
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public PhotoResponse upload(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long placeId,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "caption", required = false) String caption) {
    return photoService.upload(principal.getId(), placeId, file, caption);
  }
}
