package com.granada.guide.config;

import com.granada.guide.entity.User;
import com.granada.guide.repository.UserRepository;
import com.granada.guide.service.GroupService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements CommandLineRunner {
  private static final String USER1_EMAIL = "test1@mail.com";
  private static final String USER2_EMAIL = "test2@mail.com";
  private static final String DEFAULT_PASSWORD = "123456";

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final GroupService groupService;

  public DataSeeder(UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      GroupService groupService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.groupService = groupService;
  }

  @Override
  @Transactional
  public void run(String... args) {
    User user1 = ensureUser(USER1_EMAIL, "Usuario 1");
    User user2 = ensureUser(USER2_EMAIL, "Usuario 2");
    groupService.getOrCreateDefaultGroupForUser(user1);
    groupService.getOrCreateDefaultGroupForUser(user2);
  }

  private User ensureUser(String email, String name) {
    return userRepository.findByEmail(email)
        .orElseGet(() -> {
          User user = new User();
          user.setEmail(email);
          user.setName(name);
          user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
          return userRepository.save(user);
        });
  }
}
