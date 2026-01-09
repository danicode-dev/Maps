package com.granada.guide.service;

import com.granada.guide.dto.AuthDtos.AuthResponse;
import com.granada.guide.dto.AuthDtos.LoginRequest;
import com.granada.guide.dto.AuthDtos.MeResponse;
import com.granada.guide.dto.AuthDtos.RegisterRequest;
import com.granada.guide.entity.User;
import com.granada.guide.exception.ApiException;
import com.granada.guide.repository.UserRepository;
import com.granada.guide.security.JwtTokenProvider;
import com.granada.guide.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenProvider jwtTokenProvider;
  private final GroupService groupService;

  public AuthService(UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      JwtTokenProvider jwtTokenProvider,
      GroupService groupService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtTokenProvider = jwtTokenProvider;
    this.groupService = groupService;
  }

  public MeResponse me(UserPrincipal principal) {
    return new MeResponse(principal.getId(), principal.getUsername(), principal.getName());
  }

  public AuthResponse register(RegisterRequest request) {
    String normalized = request.email().toLowerCase();
    if (userRepository.findByEmail(normalized).isPresent()) {
      throw new ApiException(HttpStatus.CONFLICT, "El correo ya esta registrado");
    }
    User user = new User();
    user.setEmail(normalized);
    user.setName(request.name());
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    User saved = userRepository.save(user);
    groupService.getOrCreateDefaultGroupForUser(saved);
    String token = jwtTokenProvider.generateToken(UserPrincipal.fromUser(saved));
    return new AuthResponse(token);
  }

  public AuthResponse login(LoginRequest request) {
    User user = userRepository.findByEmail(request.email().toLowerCase())
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Credenciales invalidas"));
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Credenciales invalidas");
    }
    String token = jwtTokenProvider.generateToken(UserPrincipal.fromUser(user));
    return new AuthResponse(token);
  }

  public User getUserOrThrow(Long userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
  }
}
