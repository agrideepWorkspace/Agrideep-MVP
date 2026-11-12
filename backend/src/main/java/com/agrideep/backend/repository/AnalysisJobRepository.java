package com.agrideep.backend.repository;

import java.util.List;
import java.util.UUID;

import com.agrideep.backend.model.AnalysisJob;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisJobRepository extends JpaRepository<AnalysisJob, UUID> {

	List<AnalysisJob> findAllByParcel_IdOrderByCreatedAtDesc(UUID parcelId);

	void deleteAllByParcel_Id(UUID parcelId);
}
