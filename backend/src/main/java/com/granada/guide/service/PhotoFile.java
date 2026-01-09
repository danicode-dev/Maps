package com.granada.guide.service;

import org.springframework.core.io.Resource;

public record PhotoFile(Resource resource, String contentType) {}
