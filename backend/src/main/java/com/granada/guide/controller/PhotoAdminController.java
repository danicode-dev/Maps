package com.granada.guide.controller;

import com.granada.guide.security.UserPrincipal;
import com.granada.guide.service.PhotoFile;
import com.granada.guide.service.PhotoService;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/photos")
public class PhotoAdminController {
  private final PhotoService photoService;

  public PhotoAdminController(PhotoService photoService) {
    this.photoService = photoService;
  }

  @DeleteMapping("/{id}")
  public void delete(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("id") Long photoId) {
    photoService.delete(principal.getId(), photoId);
  }

  @GetMapping("/{id}/file")
  public ResponseEntity<Resource> file(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("id") Long photoId) {
    PhotoFile photoFile = photoService.loadFile(principal.getId(), photoId);
    MediaType contentType = MediaType.APPLICATION_OCTET_STREAM;
    if (photoFile.contentType() != null && !photoFile.contentType().isBlank()) {
      contentType = MediaType.parseMediaType(photoFile.contentType());
    }
    return ResponseEntity.ok()
        .contentType(contentType)
        .body(photoFile.resource());
  }
}
