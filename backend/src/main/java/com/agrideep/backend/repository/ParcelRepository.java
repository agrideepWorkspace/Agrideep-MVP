package com.agrideep.backend.repository;

import java.util.List;
import java.util.UUID;

import com.agrideep.backend.model.Parcel;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParcelRepository extends JpaRepository<Parcel, UUID> {

	List<Parcel> findAllByOwnerIdOrderByCreatedAtDesc(String ownerId);

	java.util.Optional<Parcel> findByIdAndOwnerId(UUID id, String ownerId);

	boolean existsByIdAndOwnerId(UUID id, String ownerId);

	void deleteByIdAndOwnerId(UUID id, String ownerId);

}
