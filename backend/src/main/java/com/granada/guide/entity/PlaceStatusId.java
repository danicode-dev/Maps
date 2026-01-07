package com.granada.guide.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class PlaceStatusId implements Serializable {
  @Column(name = "place_id")
  private Long placeId;

  @Column(name = "user_id")
  private Long userId;

  public PlaceStatusId() {}

  public PlaceStatusId(Long placeId, Long userId) {
    this.placeId = placeId;
    this.userId = userId;
  }

  public Long getPlaceId() {
    return placeId;
  }

  public void setPlaceId(Long placeId) {
    this.placeId = placeId;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || getClass() != o.getClass()) {
      return false;
    }
    PlaceStatusId that = (PlaceStatusId) o;
    return Objects.equals(placeId, that.placeId) && Objects.equals(userId, that.userId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(placeId, userId);
  }
}
