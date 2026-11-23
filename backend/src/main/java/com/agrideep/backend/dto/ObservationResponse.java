package com.agrideep.backend.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import tools.jackson.databind.JsonNode;

public record ObservationResponse(
		UUID id,
		LocalDate acquisitionDate,
		Instant acquiredAt,
		String imageId,
		boolean valid,
		String invalidReason,
		Integer validPixelCount,
		Double validPixelPct,
		Double cloudPct,
		JsonNode ndvi,
		JsonNode ndmi,
		Double ndviLo,
		Double ndviHi,
		Double ndmiLo,
		Double ndmiHi,
		JsonNode overlayCoordinates,
		String ndviOverlayUrl,
		String ndmiOverlayUrl) {
}
