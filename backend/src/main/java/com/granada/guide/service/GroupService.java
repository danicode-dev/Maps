package com.granada.guide.service;

import com.granada.guide.dto.GroupDtos.CreateGroupRequest;
import com.granada.guide.dto.GroupDtos.GroupResponse;
import com.granada.guide.dto.GroupDtos.InviteResponse;
import com.granada.guide.dto.GroupDtos.JoinGroupRequest;
import com.granada.guide.entity.Group;
import com.granada.guide.entity.GroupInvite;
import com.granada.guide.entity.GroupMember;
import com.granada.guide.entity.GroupMemberId;
import com.granada.guide.entity.GroupRole;
import com.granada.guide.entity.User;
import com.granada.guide.exception.ApiException;
import com.granada.guide.repository.GroupInviteRepository;
import com.granada.guide.repository.GroupMemberRepository;
import com.granada.guide.repository.GroupRepository;
import com.granada.guide.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {
  public static final String DEFAULT_GROUP_NAME = "Pareja";
  private static final int INVITE_VALID_DAYS = 7;

  private final GroupRepository groupRepository;
  private final GroupMemberRepository groupMemberRepository;
  private final GroupInviteRepository groupInviteRepository;
  private final UserRepository userRepository;

  public GroupService(GroupRepository groupRepository,
      GroupMemberRepository groupMemberRepository,
      GroupInviteRepository groupInviteRepository,
      UserRepository userRepository) {
    this.groupRepository = groupRepository;
    this.groupMemberRepository = groupMemberRepository;
    this.groupInviteRepository = groupInviteRepository;
    this.userRepository = userRepository;
  }

  @Transactional
  public GroupResponse createGroup(Long userId, CreateGroupRequest request) {
    User user = getUserOrThrow(userId);
    Group group = new Group();
    group.setName(request.name());
    group.setCreatedBy(user);
    Group saved = groupRepository.save(group);
    ensureMember(saved, user, GroupRole.OWNER);
    return toResponse(saved);
  }

  @Transactional
  public InviteResponse createInvite(Long userId, Long groupId) {
    Group group = getGroupForMember(groupId, userId);
    GroupMember member = groupMemberRepository.findByGroup_IdAndUser_Id(groupId, userId)
        .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "No perteneces al grupo"));
    if (member.getRole() != GroupRole.OWNER) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Se requiere rol de propietario");
    }
    GroupInvite invite = new GroupInvite();
    invite.setGroup(group);
    invite.setCode(UUID.randomUUID().toString().replace("-", ""));
    invite.setExpiresAt(Instant.now().plus(INVITE_VALID_DAYS, ChronoUnit.DAYS));
    GroupInvite saved = groupInviteRepository.save(invite);
    return new InviteResponse(saved.getCode(), saved.getExpiresAt());
  }

  @Transactional
  public GroupResponse joinGroup(Long userId, JoinGroupRequest request) {
    User user = getUserOrThrow(userId);
    GroupInvite invite = groupInviteRepository.findByCodeAndUsedFalse(request.code())
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Invitacion no encontrada"));
    if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(Instant.now())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Invitacion caducada");
    }
    Group group = invite.getGroup();
    ensureMember(group, user, GroupRole.MEMBER);
    invite.setUsed(true);
    groupInviteRepository.save(invite);
    return toResponse(group);
  }

  @Transactional
  public Group getOrCreateDefaultGroupForUser(User user) {
    Group group = groupRepository.findByName(DEFAULT_GROUP_NAME)
        .orElseGet(() -> {
          Group created = new Group();
          created.setName(DEFAULT_GROUP_NAME);
          created.setCreatedBy(user);
          return groupRepository.save(created);
        });
    GroupRole role = group.getCreatedBy().getId().equals(user.getId())
        ? GroupRole.OWNER
        : GroupRole.MEMBER;
    ensureMember(group, user, role);
    return group;
  }

  @Transactional(readOnly = true)
  public Group getGroupForMember(Long groupId, Long userId) {
    Group group = groupRepository.findById(groupId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Grupo no encontrado"));
    if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "No perteneces al grupo");
    }
    return group;
  }

  @Transactional(readOnly = true)
  public List<Long> getGroupIdsForUser(Long userId) {
    return groupMemberRepository.findGroupIdsByUserId(userId);
  }

  @Transactional(readOnly = true)
  public boolean isOwnerAnywhere(Long userId) {
    return groupMemberRepository.existsByUser_IdAndRole(userId, GroupRole.OWNER);
  }

  private void ensureMember(Group group, User user, GroupRole role) {
    GroupMember existing = groupMemberRepository.findByGroup_IdAndUser_Id(group.getId(), user.getId())
        .orElse(null);
    if (existing != null) {
      if (existing.getRole() != role) {
        existing.setRole(role);
        groupMemberRepository.save(existing);
      }
      return;
    }
    GroupMember member = new GroupMember();
    member.setId(new GroupMemberId(group.getId(), user.getId()));
    member.setGroup(group);
    member.setUser(user);
    member.setRole(role);
    groupMemberRepository.save(member);
  }

  private GroupResponse toResponse(Group group) {
    return new GroupResponse(group.getId(), group.getName(), group.getCreatedAt());
  }

  private User getUserOrThrow(Long userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
  }
}
