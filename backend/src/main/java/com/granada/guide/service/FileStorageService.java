package com.granada.guide.service;

import com.granada.guide.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {
  private final Path uploadRoot;

  public FileStorageService(@Value("${app.upload.dir}") String uploadDir) {
    this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
  }

  public String storePlacePhoto(Long placeId, MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "El archivo es obligatorio");
    }
    String original = file.getOriginalFilename();
    String ext = "";
    if (original != null && original.contains(".")) {
      ext = original.substring(original.lastIndexOf('.'));
    }
    String filename = UUID.randomUUID().toString().replace("-", "") + ext;
    Path placeDir = uploadRoot.resolve("place-" + placeId);
    try {
      Files.createDirectories(placeDir);
      Path target = placeDir.resolve(filename);
      Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
      return "/uploads/" + "place-" + placeId + "/" + filename;
    } catch (IOException ex) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar el archivo");
    }
  }

  public Path resolvePath(String url) {
    if (url == null || !url.startsWith("/uploads/")) {
      throw new ApiException(HttpStatus.NOT_FOUND, "Archivo no encontrado");
    }
    String relative = url.substring("/uploads/".length());
    Path resolved = uploadRoot.resolve(relative).normalize();
    if (!resolved.startsWith(uploadRoot)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Ruta de archivo invalida");
    }
    if (!Files.exists(resolved)) {
      throw new ApiException(HttpStatus.NOT_FOUND, "Archivo no encontrado");
    }
    return resolved;
  }

  public Resource loadAsResource(Path path) {
    try {
      Resource resource = new UrlResource(path.toUri());
      if (!resource.exists()) {
        throw new ApiException(HttpStatus.NOT_FOUND, "Archivo no encontrado");
      }
      return resource;
    } catch (IOException ex) {
      throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo cargar el archivo");
    }
  }

  public String detectContentType(Path path) {
    try {
      String contentType = Files.probeContentType(path);
      return contentType == null ? "application/octet-stream" : contentType;
    } catch (IOException ex) {
      return "application/octet-stream";
    }
  }
}
