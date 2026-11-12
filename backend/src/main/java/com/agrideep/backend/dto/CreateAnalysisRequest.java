package com.agrideep.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateAnalysisRequest {

	@NotNull
	private LocalDate startDate;

	@NotNull
	private LocalDate endDate;

	@DecimalMin("0.0")
	@DecimalMax("100.0")
	private Double maxCloudPct;
}
