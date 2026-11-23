package com.agrideep.backend.controller;

import com.agrideep.backend.dto.CurrentUserResponse;
import com.agrideep.backend.service.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class CurrentUserController {

	private final CurrentUserService currentUserService;

	@GetMapping("/me")
	public CurrentUserResponse me(@AuthenticationPrincipal Jwt jwt) {
		return currentUserService.provisionFrom(jwt);
	}
}
