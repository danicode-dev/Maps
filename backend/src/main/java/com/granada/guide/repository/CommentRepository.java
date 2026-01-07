package com.granada.guide.repository;

import com.granada.guide.entity.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
  List<Comment> findByPlace_IdAndHiddenFalseOrderByCreatedAtAsc(Long placeId);
}
