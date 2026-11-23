package com.agrideep.backend.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Application profile keyed by the user's Keycloak subject (the {@code sub} claim). */
@Entity
@Table(name = "app_users")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AppUser {

	public static final int MAX_ID_LENGTH = 255;

	@Id
	@Column(nullable = false, length = MAX_ID_LENGTH)
	private String id;

	@Column(length = 320)
	private String email;

	@Column(name = "display_name", length = 255)
	private String displayName;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@PrePersist
	private void initializeTimestamps() {
		Instant now = Instant.now();
		if (createdAt == null) {
			createdAt = now;
		}
		if (updatedAt == null) {
			updatedAt = now;
		}
	}

	@PreUpdate
	private void refreshUpdatedAt() {
		updatedAt = Instant.now();
	}
}
