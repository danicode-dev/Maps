package com.granada.guide.dto;

import com.granada.guide.dto.CommonDtos.UserSummary;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

public class CommentDtos {
  public record CreateCommentRequest(@NotBlank String text) {}

  public record CommentResponse(Long id, UserSummary user, String text, Instant createdAt) {}
}
