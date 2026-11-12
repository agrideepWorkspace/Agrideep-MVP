package com.agrideep.backend.dto;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.JsonNode;

public record AnalysisWorkerEvent(
		@JsonProperty("job_id") UUID jobId,
		String status,
		JsonNode result,
		@JsonProperty("error_code") String errorCode,
		@JsonProperty("error_message") String errorMessage) {
}
