package com.granada.guide.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "place_status")
public class PlaceStatus {
  @EmbeddedId
  private PlaceStatusId id = new PlaceStatusId();

  @ManyToOne(fetch = FetchType.LAZY)
  @MapsId("placeId")
  @JoinColumn(name = "place_id", nullable = false)
  private Place place;

  @ManyToOne(fetch = FetchType.LAZY)
  @MapsId("userId")
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PlaceVisitStatus status;

  @Column(name = "is_favorite", nullable = false)
  private boolean favorite = false;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  public PlaceStatusId getId() {
    return id;
  }

  public void setId(PlaceStatusId id) {
    this.id = id;
  }

  public Place getPlace() {
    return place;
  }

  public void setPlace(Place place) {
    this.place = place;
  }

  public User getUser() {
    return user;
  }

  public void setUser(User user) {
    this.user = user;
  }

  public PlaceVisitStatus getStatus() {
    return status;
  }

  public void setStatus(PlaceVisitStatus status) {
    this.status = status;
  }

  public boolean isFavorite() {
    return favorite;
  }

  public void setFavorite(boolean favorite) {
    this.favorite = favorite;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
