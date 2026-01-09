package com.granada.guide.repository;

import com.granada.guide.entity.Place;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceRepository extends JpaRepository<Place, Long> {
  List<Place> findByGroup_IdIn(List<Long> groupIds);

  List<Place> findByGroup_IdInAndLatBetweenAndLngBetween(
      List<Long> groupIds, Double minLat, Double maxLat, Double minLng, Double maxLng);

  List<Place> findByGroup_Id(Long groupId);
}
