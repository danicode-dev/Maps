package com.granada.guide.controller;

import com.granada.guide.dto.GroupDtos.CreateGroupRequest;
import com.granada.guide.dto.GroupDtos.GroupResponse;
import com.granada.guide.dto.GroupDtos.InviteResponse;
import com.granada.guide.dto.GroupDtos.JoinGroupRequest;
import com.granada.guide.security.UserPrincipal;
import com.granada.guide.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups")
public class GroupController {
  private final GroupService groupService;

  public GroupController(GroupService groupService) {
    this.groupService = groupService;
  }

  @PostMapping
  public GroupResponse create(@AuthenticationPrincipal UserPrincipal principal,
      @Valid @RequestBody CreateGroupRequest request) {
    return groupService.createGroup(principal.getId(), request);
  }

  @PostMapping("/{id}/invite")
  public InviteResponse invite(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("id") Long groupId) {
    return groupService.createInvite(principal.getId(), groupId);
  }

  @PostMapping("/join")
  public GroupResponse join(@AuthenticationPrincipal UserPrincipal principal,
      @Valid @RequestBody JoinGroupRequest request) {
    return groupService.joinGroup(principal.getId(), request);
  }
}
