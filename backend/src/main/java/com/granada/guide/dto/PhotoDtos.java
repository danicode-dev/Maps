package com.granada.guide.dto;

import com.granada.guide.dto.CommonDtos.UserSummary;
import java.time.Instant;

public class PhotoDtos {
  public record PhotoResponse(Long id, UserSummary user, String url, String caption, Instant createdAt) {}
}
