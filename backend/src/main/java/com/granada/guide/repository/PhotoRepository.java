package com.granada.guide.repository;

import com.granada.guide.entity.Photo;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoRepository extends JpaRepository<Photo, Long> {
  List<Photo> findByPlace_IdAndHiddenFalseOrderByCreatedAtAsc(Long placeId);
}
