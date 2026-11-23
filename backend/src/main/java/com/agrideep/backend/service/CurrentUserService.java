package com.agrideep.backend.service;

import com.agrideep.backend.dto.CurrentUserResponse;
import com.agrideep.backend.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

	private final AppUserRepository appUserRepository;

	@Transactional
	public CurrentUserResponse provisionFrom(Jwt jwt) {
		insertIfAbsent(jwt);
		return appUserRepository.findById(jwt.getSubject())
				.map(CurrentUserResponse::from)
				.orElseThrow(() -> new IllegalStateException("Could not provision the authenticated user."));
	}

	@Transactional
	public void ensureProfileExists(Jwt jwt) {
		insertIfAbsent(jwt);
	}

	private void insertIfAbsent(Jwt jwt) {
		String displayName = jwt.getClaimAsString("name");
		if (displayName == null || displayName.isBlank()) {
			displayName = jwt.getClaimAsString("preferred_username");
		}
		appUserRepository.insertIfAbsent(jwt.getSubject(), jwt.getClaimAsString("email"), displayName);
	}
}
