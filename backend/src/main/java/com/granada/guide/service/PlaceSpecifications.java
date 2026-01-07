package com.granada.guide.service;

import com.granada.guide.entity.Place;
import com.granada.guide.entity.PlaceStatus;
import com.granada.guide.entity.PlaceVisitStatus;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;

public final class PlaceSpecifications {
  private PlaceSpecifications() {}

  public static Specification<Place> belongsToGroups(List<Long> groupIds) {
    return (root, query, cb) -> root.get("group").get("id").in(groupIds);
  }

  public static Specification<Place> hasCategory(Long categoryId) {
    return (root, query, cb) -> cb.equal(root.get("category").get("id"), categoryId);
  }

  public static Specification<Place> matchesQuery(String q) {
    return (root, query, cb) -> {
      String like = "%" + q.toLowerCase() + "%";
      Predicate name = cb.like(cb.lower(root.get("name")), like);
      Predicate desc = cb.like(cb.lower(root.get("description")), like);
      Predicate addr = cb.like(cb.lower(root.get("address")), like);
      return cb.or(name, desc, addr);
    };
  }

  public static Specification<Place> hasStatusForUser(Long userId, PlaceVisitStatus status) {
    return (root, query, cb) -> {
      query.distinct(true);
      Join<Place, PlaceStatus> join = root.join("statuses");
      Predicate userPredicate = cb.equal(join.get("user").get("id"), userId);
      Predicate statusPredicate = cb.equal(join.get("status"), status);
      return cb.and(userPredicate, statusPredicate);
    };
  }
}
