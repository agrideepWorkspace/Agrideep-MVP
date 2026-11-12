package com.agrideep.backend.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.agrideep.backend.model.AnalysisJob;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Builder;
import lombok.Value;
import tools.jackson.databind.JsonNode;

@Value
@Builder
@JsonPropertyOrder({ "id", "parcelId", "parcelName", "startDate", "endDate", "maxCloudPct", "status",
		"errorCode", "errorMessage", "result", "createdAt", "updatedAt" })
public class AnalysisJobResponse {

	UUID id;

	UUID parcelId;

	String parcelName;

	LocalDate startDate;

	LocalDate endDate;

	Double maxCloudPct;

	String status;

	String errorCode;

	String errorMessage;

	JsonNode result;

	Instant createdAt;

	Instant updatedAt;

	public static AnalysisJobResponse from(AnalysisJob job) {
		return AnalysisJobResponse.builder()
				.id(job.getId())
				.parcelId(job.getParcel().getId())
				.parcelName(job.getParcel().getName())
				.startDate(job.getStartDate())
				.endDate(job.getEndDate())
				.maxCloudPct(job.getMaxCloudPct())
				.status(job.getStatus().name())
				.errorCode(job.getErrorCode())
				.errorMessage(job.getErrorMessage())
				.result(job.getResult())
				.createdAt(job.getCreatedAt())
				.updatedAt(job.getUpdatedAt())
				.build();
	}
}
