package com.agrideep.backend.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import tools.jackson.databind.JsonNode;

@Entity
@Table(name = "analysis_jobs")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AnalysisJob {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "parcel_id", nullable = false)
	private Parcel parcel;

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(name = "end_date", nullable = false)
	private LocalDate endDate;

	@Column(name = "max_cloud_pct")
	private Double maxCloudPct;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private AnalysisJobStatus status;

	@Column(name = "error_code", length = 80)
	private String errorCode;

	@Column(name = "error_message", length = 1000)
	private String errorMessage;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb")
	private JsonNode result;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@PrePersist
	void initializeTimestamps() {
		Instant now = Instant.now();
		createdAt = now;
		updatedAt = now;
	}

	@PreUpdate
	void updateTimestamp() {
		updatedAt = Instant.now();
	}

	public void markRunning() {
		if (!isTerminal()) {
			status = AnalysisJobStatus.RUNNING;
			errorCode = null;
			errorMessage = null;
		}
	}

	public void complete(JsonNode analysisResult) {
		if (!isTerminal()) {
			status = AnalysisJobStatus.COMPLETED;
			result = analysisResult;
			errorCode = null;
			errorMessage = null;
		}
	}

	public void fail(String code, String message, JsonNode analysisResult) {
		if (!isTerminal()) {
			status = AnalysisJobStatus.FAILED;
			errorCode = code;
			errorMessage = message;
			result = analysisResult;
		}
	}

	private boolean isTerminal() {
		return status == AnalysisJobStatus.COMPLETED || status == AnalysisJobStatus.FAILED;
	}
}
