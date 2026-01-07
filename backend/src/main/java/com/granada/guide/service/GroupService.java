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
import com.granada.guide.entity.Place;
import com.granada.guide.entity.PlaceStatus;
import com.granada.guide.entity.PlaceStatusId;
import com.granada.guide.entity.PlaceVisitStatus;
import com.granada.guide.entity.User;
import com.granada.guide.exception.ApiException;
import com.granada.guide.repository.GroupInviteRepository;
import com.granada.guide.repository.GroupMemberRepository;
import com.granada.guide.repository.GroupRepository;
import com.granada.guide.repository.PlaceRepository;
import com.granada.guide.repository.PlaceStatusRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupService {
  private final GroupRepository groupRepository;
  private final GroupMemberRepository groupMemberRepository;
  private final GroupInviteRepository groupInviteRepository;
  private final PlaceRepository placeRepository;
  private final PlaceStatusRepository placeStatusRepository;
  private final AuthService authService;

  public GroupService(GroupRepository groupRepository,
      GroupMemberRepository groupMemberRepository,
      GroupInviteRepository groupInviteRepository,
      PlaceRepository placeRepository,
      PlaceStatusRepository placeStatusRepository,
      AuthService authService) {
    this.groupRepository = groupRepository;
    this.groupMemberRepository = groupMemberRepository;
    this.groupInviteRepository = groupInviteRepository;
    this.placeRepository = placeRepository;
    this.placeStatusRepository = placeStatusRepository;
    this.authService = authService;
  }

  @Transactional
  public GroupResponse createGroup(Long userId, CreateGroupRequest request) {
    User user = authService.getUserOrThrow(userId);
    Group group = new Group();
    group.setName(request.name());
    group.setCreatedBy(user);
    Group saved = groupRepository.save(group);

    GroupMember member = new GroupMember();
    member.setGroup(saved);
    member.setUser(user);
    member.setRole(GroupRole.OWNER);
    member.setId(new GroupMemberId(saved.getId(), user.getId()));
    groupMemberRepository.save(member);

    return new GroupResponse(saved.getId(), saved.getName(), saved.getCreatedAt());
  }

  @Transactional
  public InviteResponse createInvite(Long userId, Long groupId) {
    Group group = getGroupForMember(groupId, userId);
    requireOwner(groupId, userId);
    GroupInvite invite = new GroupInvite();
    invite.setGroup(group);
    invite.setCode(generateCode());
    invite.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
    GroupInvite saved = groupInviteRepository.save(invite);
    return new InviteResponse(saved.getCode(), saved.getExpiresAt());
  }

  @Transactional
  public GroupResponse joinGroup(Long userId, JoinGroupRequest request) {
    GroupInvite invite = groupInviteRepository.findByCodeAndUsedFalse(request.code())
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Invite code not found"));
    if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(Instant.now())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Invite code expired");
    }
    Group group = invite.getGroup();
    if (groupMemberRepository.existsByGroup_IdAndUser_Id(group.getId(), userId)) {
      throw new ApiException(HttpStatus.CONFLICT, "Already a member of this group");
    }
    User user = authService.getUserOrThrow(userId);
    GroupMember member = new GroupMember();
    member.setGroup(group);
    member.setUser(user);
    member.setRole(GroupRole.MEMBER);
    member.setId(new GroupMemberId(group.getId(), userId));
    groupMemberRepository.save(member);

    List<Place> places = placeRepository.findByGroup_Id(group.getId());
    if (!places.isEmpty()) {
      List<PlaceStatus> statuses = new ArrayList<>();
      for (Place place : places) {
        PlaceStatus status = new PlaceStatus();
        status.setPlace(place);
        status.setUser(user);
        status.setStatus(PlaceVisitStatus.PENDING);
        status.setId(new PlaceStatusId(place.getId(), userId));
        statuses.add(status);
      }
      placeStatusRepository.saveAll(statuses);
    }

    invite.setUsed(true);
    groupInviteRepository.save(invite);

    return new GroupResponse(group.getId(), group.getName(), group.getCreatedAt());
  }

  public Group getGroupForMember(Long groupId, Long userId) {
    Group group = groupRepository.findById(groupId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Group not found"));
    if (!groupMemberRepository.existsByGroup_IdAndUser_Id(groupId, userId)) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Not a member of this group");
    }
    return group;
  }

  public void requireOwner(Long groupId, Long userId) {
    GroupMember member = groupMemberRepository.findByGroup_IdAndUser_Id(groupId, userId)
        .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Not a member of this group"));
    if (member.getRole() != GroupRole.OWNER) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Owner role required");
    }
  }

  public List<Long> getGroupIdsForUser(Long userId) {
    return groupMemberRepository.findGroupIdsByUserId(userId);
  }

  public boolean isOwnerAnywhere(Long userId) {
    return groupMemberRepository.existsByUser_IdAndRole(userId, GroupRole.OWNER);
  }

  private String generateCode() {
    return UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
  }
}
