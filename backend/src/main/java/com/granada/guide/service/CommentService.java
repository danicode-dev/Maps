package com.granada.guide.service;

import com.granada.guide.dto.CommentDtos.CommentResponse;
import com.granada.guide.dto.CommentDtos.CreateCommentRequest;
import com.granada.guide.dto.CommonDtos.UserSummary;
import com.granada.guide.entity.Comment;
import com.granada.guide.entity.Place;
import com.granada.guide.entity.User;
import com.granada.guide.exception.ApiException;
import com.granada.guide.repository.CommentRepository;
import com.granada.guide.repository.PlaceRepository;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommentService {
  private final CommentRepository commentRepository;
  private final PlaceRepository placeRepository;
  private final GroupService groupService;
  private final AuthService authService;

  public CommentService(CommentRepository commentRepository,
      PlaceRepository placeRepository,
      GroupService groupService,
      AuthService authService) {
    this.commentRepository = commentRepository;
    this.placeRepository = placeRepository;
    this.groupService = groupService;
    this.authService = authService;
  }

  @Transactional(readOnly = true)
  public List<CommentResponse> list(Long userId, Long placeId) {
    Place place = getPlaceForMember(placeId, userId);
    return commentRepository.findByPlace_IdAndHiddenFalseOrderByCreatedAtAsc(place.getId())
        .stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  @Transactional
  public CommentResponse create(Long userId, Long placeId, CreateCommentRequest request) {
    Place place = getPlaceForMember(placeId, userId);
    User user = authService.getUserOrThrow(userId);
    Comment comment = new Comment();
    comment.setPlace(place);
    comment.setUser(user);
    comment.setText(request.text());
    Comment saved = commentRepository.save(comment);
    return toResponse(saved);
  }

  private Place getPlaceForMember(Long placeId, Long userId) {
    Place place = placeRepository.findById(placeId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Sitio no encontrado"));
    groupService.getGroupForMember(place.getGroup().getId(), userId);
    return place;
  }

  private CommentResponse toResponse(Comment comment) {
    UserSummary user = new UserSummary(comment.getUser().getId(), comment.getUser().getName());
    return new CommentResponse(comment.getId(), user, comment.getText(), comment.getCreatedAt());
  }
}
