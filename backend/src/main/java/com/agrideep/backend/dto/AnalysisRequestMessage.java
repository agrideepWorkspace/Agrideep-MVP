package com.agrideep.backend.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.agrideep.backend.model.PolygonGeometry;
import com.fasterxml.jackson.annotation.JsonProperty;

public record AnalysisRequestMessage(
		@JsonProperty("job_id") UUID jobId,
		PolygonGeometry geometry,
		@JsonProperty("start_date") LocalDate startDate,
		@JsonProperty("end_date") LocalDate endDate,
		@JsonProperty("max_cloud_pct") Double maxCloudPct) {
}
