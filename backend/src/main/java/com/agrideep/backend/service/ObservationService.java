package com.agrideep.backend.service;

import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.agrideep.backend.dto.ObservationResponse;
import com.agrideep.backend.exception.AnalysisArtifactNotFoundException;
import com.agrideep.backend.exception.ParcelNotFoundException;
import com.agrideep.backend.model.Observation;
import com.agrideep.backend.model.Parcel;
import com.agrideep.backend.repository.AnalysisJobRepository;
import com.agrideep.backend.repository.ObservationRepository;
import com.agrideep.backend.repository.ParcelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
@RequiredArgsConstructor
public class ObservationService {
	private final ParcelRepository parcelRepository;
	private final AnalysisJobRepository analysisJobRepository;
	private final ObservationRepository observationRepository;
	private final ArtifactStorage artifactStorage;
	private final ObjectMapper objectMapper;

	@Transactional
	public void upsertCompleted(UUID jobId, JsonNode result) {
		if (result == null || result.path("observations").isMissingNode()) {
			return;
		}
		var job = analysisJobRepository.findById(jobId).orElse(null);
		if (job == null) {
			return;
		}
		Map<String, JsonNode> overlays = Map.of();
		if (result.path("artifacts").path("overlays").isArray()) {
			overlays = new java.util.HashMap<>();
			for (JsonNode overlay : result.path("artifacts").path("overlays")) {
				String key = overlay.path("index").asText() + ":" + overlay.path("date").asText();
				((java.util.Map<String, JsonNode>) overlays).put(key, overlay);
			}
		}
		for (JsonNode item : result.path("observations")) {
			if (!item.path("valid").asBoolean(false)) {
				continue;
			}
			String acquiredAtValue = item.path("acquired_at").asText();
			Instant acquiredAt = Instant.parse(acquiredAtValue);
			String imageId = observationImageId(item.path("image_id").asText(), acquiredAtValue);
			Observation existing = observationRepository
					.findByParcel_IdAndImageId(job.getParcel().getId(), imageId).orElse(null);
			Observation observation = existing != null ? existing : Observation.builder()
					.parcel(job.getParcel())
					.build();
			JsonNode ndviStats = item.path("statistics").path("ndvi");
			JsonNode ndmiStats = item.path("statistics").path("ndmi");
			String date = item.path("date").asText();
			JsonNode ndviOverlay = overlays.get("ndvi:" + date);
			JsonNode ndmiOverlay = overlays.get("ndmi:" + date);
			String ndviKey = ndviOverlay == null ? null : jobId + "/" + ndviOverlay.path("png").asText();
			String ndmiKey = ndmiOverlay == null ? null : jobId + "/" + ndmiOverlay.path("png").asText();
			JsonNode coordinates = ndviOverlay != null
					? ndviOverlay.path("coordinates") : null;
			var builder = Observation.builder()
					.id(observation.getId())
					.parcel(job.getParcel())
					.jobId(jobId)
					.acquisitionDate(LocalDate.parse(date))
					.acquiredAt(acquiredAt)
					.imageId(imageId)
					.valid(item.path("valid").asBoolean(false))
					.invalidReason(item.path("invalid_reason").asText(null))
					.validPixelCount(item.path("statistics").path("valid_pixel_count").asInt(0))
					.validPixelPct(item.path("valid_pixel_pct").asDouble())
					.cloudPct(item.path("cloud_pct").asDouble())
					.ndviMean(ndviStats.path("mean").isNumber() ? ndviStats.path("mean").doubleValue() : null)
					.ndviMedian(ndviStats.path("median").isNumber() ? ndviStats.path("median").doubleValue() : null)
					.ndviMin(ndviStats.path("min").isNumber() ? ndviStats.path("min").doubleValue() : null)
					.ndviMax(ndviStats.path("max").isNumber() ? ndviStats.path("max").doubleValue() : null)
					.ndviStd(ndviStats.path("std_dev").isNumber() ? ndviStats.path("std_dev").doubleValue() : null)
					.ndmiMean(ndmiStats.path("mean").isNumber() ? ndmiStats.path("mean").doubleValue() : null)
					.ndmiMedian(ndmiStats.path("median").isNumber() ? ndmiStats.path("median").doubleValue() : null)
					.ndmiMin(ndmiStats.path("min").isNumber() ? ndmiStats.path("min").doubleValue() : null)
					.ndmiMax(ndmiStats.path("max").isNumber() ? ndmiStats.path("max").doubleValue() : null)
					.ndmiStd(ndmiStats.path("std_dev").isNumber() ? ndmiStats.path("std_dev").doubleValue() : null)
					.ndviOverlayKey(ndviKey)
					.ndmiOverlayKey(ndmiKey)
					.ndviLo(ndviOverlay == null ? null : ndviOverlay.path("lo").isNumber() ? ndviOverlay.path("lo").doubleValue() : null)
					.ndmiLo(ndmiOverlay == null ? null : ndmiOverlay.path("lo").isNumber() ? ndmiOverlay.path("lo").doubleValue() : null)
					.ndviHi(ndviOverlay == null ? null : ndviOverlay.path("hi").isNumber() ? ndviOverlay.path("hi").doubleValue() : null)
					.ndmiHi(ndmiOverlay == null ? null : ndmiOverlay.path("hi").isNumber() ? ndmiOverlay.path("hi").doubleValue() : null)
					.overlayCoordinates(coordinates);
			observationRepository.save(builder.build());
		}
	}

	static String observationImageId(String imageId, String acquiredAt) {
		return imageId.isBlank() ? "acquired_at:" + acquiredAt : imageId;
	}

	@Transactional(readOnly = true)
	public List<ObservationResponse> list(UUID parcelId, LocalDate from, LocalDate to, boolean validOnly) {
		if (!parcelRepository.existsById(parcelId)) {
			throw new ParcelNotFoundException(parcelId);
		}
		return observationRepository.findTimeline(parcelId, from, to, validOnly).stream()
				.map(this::toResponse).toList();
	}

	private ObservationResponse toResponse(Observation observation) {
		UUID parcelId = observation.getParcel().getId();
		String ndviUrl = observation.getNdviOverlayKey() == null ? null
				: "/parcels/" + parcelId + "/observations/" + observation.getId() + "/overlay/ndvi.png";
		String ndmiUrl = observation.getNdmiOverlayKey() == null ? null
				: "/parcels/" + parcelId + "/observations/" + observation.getId() + "/overlay/ndmi.png";
		ObjectNode ndvi = objectMapper.createObjectNode();
		ndvi.put("mean", observation.getNdviMean()).put("median", observation.getNdviMedian())
				.put("min", observation.getNdviMin()).put("max", observation.getNdviMax())
				.put("std_dev", observation.getNdviStd());
		ObjectNode ndmi = objectMapper.createObjectNode();
		ndmi.put("mean", observation.getNdmiMean()).put("median", observation.getNdmiMedian())
				.put("min", observation.getNdmiMin()).put("max", observation.getNdmiMax())
				.put("std_dev", observation.getNdmiStd());
		return new ObservationResponse(observation.getId(), observation.getAcquisitionDate(),
				observation.getAcquiredAt(), observation.getImageId(), Boolean.TRUE.equals(observation.getValid()),
				observation.getInvalidReason(), observation.getValidPixelCount(), observation.getValidPixelPct(),
				observation.getCloudPct(), ndvi, ndmi, observation.getNdviLo(), observation.getNdviHi(),
				observation.getNdmiLo(), observation.getNdmiHi(), observation.getOverlayCoordinates(),
				ndviUrl, ndmiUrl);
	}

	@Transactional(readOnly = true)
	public Resource overlay(UUID parcelId, UUID observationId, String index) {
		String normalized = index.toLowerCase(Locale.ROOT);
		if (!normalized.equals("ndvi") && !normalized.equals("ndmi")) {
			throw new AnalysisArtifactNotFoundException();
		}
		if (!parcelRepository.existsById(parcelId)) {
			throw new ParcelNotFoundException(parcelId);
		}
		Observation observation = observationRepository.findByIdAndParcel_Id(observationId, parcelId)
				.orElseThrow(AnalysisArtifactNotFoundException::new);
		String key = normalized.equals("ndvi") ? observation.getNdviOverlayKey() : observation.getNdmiOverlayKey();
		if (key == null || !artifactStorage.exists(key)) {
			throw new AnalysisArtifactNotFoundException();
		}
		return artifactStorage.load(key);
	}

	public java.util.Optional<java.time.LocalDate> latestDate(UUID parcelId) {
		return observationRepository.findTopByParcel_IdOrderByAcquisitionDateDesc(parcelId)
				.map(Observation::getAcquisitionDate);
	}
}
