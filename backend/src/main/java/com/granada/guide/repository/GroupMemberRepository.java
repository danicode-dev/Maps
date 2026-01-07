package com.granada.guide.repository;

import com.granada.guide.entity.GroupMember;
import com.granada.guide.entity.GroupMemberId;
import com.granada.guide.entity.GroupRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GroupMemberRepository extends JpaRepository<GroupMember, GroupMemberId> {
  boolean existsByGroup_IdAndUser_Id(Long groupId, Long userId);

  Optional<GroupMember> findByGroup_IdAndUser_Id(Long groupId, Long userId);

  List<GroupMember> findByGroup_Id(Long groupId);

  boolean existsByUser_IdAndRole(Long userId, GroupRole role);

  @Query("select gm.group.id from GroupMember gm where gm.user.id = :userId")
  List<Long> findGroupIdsByUserId(@Param("userId") Long userId);
}
