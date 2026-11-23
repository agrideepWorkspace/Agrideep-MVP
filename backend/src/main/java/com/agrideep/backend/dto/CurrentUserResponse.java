package com.agrideep.backend.dto;

import java.time.Instant;

import com.agrideep.backend.model.AppUser;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CurrentUserResponse {

	String id;
	String email;
	String displayName;
	Instant createdAt;

	public static CurrentUserResponse from(AppUser user) {
		return CurrentUserResponse.builder()
				.id(user.getId())
				.email(user.getEmail())
				.displayName(user.getDisplayName())
				.createdAt(user.getCreatedAt())
				.build();
	}
}
