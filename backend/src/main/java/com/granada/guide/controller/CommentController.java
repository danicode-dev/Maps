package com.granada.guide.controller;

import com.granada.guide.dto.CommentDtos.CommentResponse;
import com.granada.guide.dto.CommentDtos.CreateCommentRequest;
import com.granada.guide.security.UserPrincipal;
import com.granada.guide.service.CommentService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/places/{placeId}/comments")
public class CommentController {
  private final CommentService commentService;

  public CommentController(CommentService commentService) {
    this.commentService = commentService;
  }

  @GetMapping
  public List<CommentResponse> list(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long placeId) {
    return commentService.list(principal.getId(), placeId);
  }

  @PostMapping
  public CommentResponse create(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable Long placeId,
      @Valid @RequestBody CreateCommentRequest request) {
    return commentService.create(principal.getId(), placeId, request);
  }
}
