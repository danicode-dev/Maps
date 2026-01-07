package com.granada.guide.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public class GroupDtos {
  public record CreateGroupRequest(@NotBlank @Size(max = 140) String name) {}

  public record GroupResponse(Long id, String name, Instant createdAt) {}

  public record InviteResponse(String code, Instant expiresAt) {}

  public record JoinGroupRequest(@NotBlank String code) {}
}
