package com.granada.guide.repository;

import com.granada.guide.entity.GroupInvite;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupInviteRepository extends JpaRepository<GroupInvite, Long> {
  Optional<GroupInvite> findByCodeAndUsedFalse(String code);
}
