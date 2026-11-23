package com.agrideep.backend.model;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import tools.jackson.databind.JsonNode;

@Entity
@Table(name = "observations", uniqueConstraints = @UniqueConstraint(
		name = "uk_observation_parcel_image", columnNames = {"parcel_id", "image_id"}))
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Observation {
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "parcel_id", nullable = false)
	private Parcel parcel;
	@Column(name = "job_id", nullable = false)
	private UUID jobId;
	@Column(name = "acquisition_date", nullable = false)
	private LocalDate acquisitionDate;
	@Column(name = "acquired_at")
	private Instant acquiredAt;
	private String imageId;
	private Boolean valid;
	@Column(name = "invalid_reason")
	private String invalidReason;
	@Column(name = "valid_pixel_count")
	private Integer validPixelCount;
	@Column(name = "valid_pixel_pct")
	private Double validPixelPct;
	@Column(name = "cloud_pct")
	private Double cloudPct;
	private Double ndviMean;
	private Double ndviMedian;
	private Double ndviMin;
	private Double ndviMax;
	private Double ndviStd;
	private Double ndmiMean;
	private Double ndmiMedian;
	private Double ndmiMin;
	private Double ndmiMax;
	private Double ndmiStd;
	@Column(name = "ndvi_overlay_key")
	private String ndviOverlayKey;
	@Column(name = "ndmi_overlay_key")
	private String ndmiOverlayKey;
	private Double ndviLo;
	private Double ndviHi;
	private Double ndmiLo;
	private Double ndmiHi;
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb")
	private JsonNode overlayCoordinates;
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
}
