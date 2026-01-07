package com.granada.guide.security;

import com.granada.guide.entity.User;
import java.util.Collection;
import java.util.Collections;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class UserPrincipal implements UserDetails {
  private final Long id;
  private final String email;
  private final String passwordHash;
  private final String name;

  public UserPrincipal(Long id, String email, String passwordHash, String name) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.name = name;
  }

  public static UserPrincipal fromUser(User user) {
    return new UserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), user.getName());
  }

  public Long getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return Collections.emptyList();
  }

  @Override
  public String getPassword() {
    return passwordHash;
  }

  @Override
  public String getUsername() {
    return email;
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return true;
  }
}
