package com.agrideep.backend.repository;

import com.agrideep.backend.model.AppUser;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUser, String> {

	@Modifying
	@Query(value = """
			INSERT INTO app_users (id, email, display_name)
			VALUES (:id, :email, :displayName)
			ON CONFLICT (id) DO NOTHING
			""", nativeQuery = true)
	void insertIfAbsent(@Param("id") String id,
			@Param("email") String email,
			@Param("displayName") String displayName);
}
