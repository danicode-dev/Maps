package com.granada.guide.repository;

import com.granada.guide.entity.PlaceStatus;
import com.granada.guide.entity.PlaceStatusId;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceStatusRepository extends JpaRepository<PlaceStatus, PlaceStatusId> {
  Optional<PlaceStatus> findByPlace_IdAndUser_Id(Long placeId, Long userId);

  List<PlaceStatus> findByUser_IdAndPlace_IdIn(Long userId, List<Long> placeIds);
}
