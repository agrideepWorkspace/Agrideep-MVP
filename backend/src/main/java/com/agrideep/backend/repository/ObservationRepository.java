package com.agrideep.backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.agrideep.backend.model.Observation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ObservationRepository extends JpaRepository<Observation, UUID> {
	Optional<Observation> findByParcel_IdAndImageId(UUID parcelId, String imageId);
	Optional<Observation> findTopByParcel_IdOrderByAcquisitionDateDesc(UUID parcelId);
	Optional<Observation> findByIdAndParcel_Id(UUID id, UUID parcelId);
	@Query("select o from Observation o where o.parcel.id = :parcelId and o.acquisitionDate >= :from and o.acquisitionDate <= :to and (:validOnly = false or o.valid = true) order by o.acquisitionDate asc")
	List<Observation> findTimeline(UUID parcelId, LocalDate from, LocalDate to, boolean validOnly);
}
