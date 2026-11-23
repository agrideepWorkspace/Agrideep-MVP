package com.agrideep.backend.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import com.agrideep.backend.dto.CreateParcelRequest;
import com.agrideep.backend.dto.ParcelResponse;
import com.agrideep.backend.exception.ParcelNotFoundException;
import com.agrideep.backend.mapper.ParcelMapper;
import com.agrideep.backend.model.Parcel;
import com.agrideep.backend.model.PolygonMeasurements;
import com.agrideep.backend.repository.ParcelRepository;
import com.agrideep.backend.repository.AnalysisJobRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Polygon;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ParcelService {

	private final ParcelRepository parcelRepository;

	private final AnalysisJobRepository analysisJobRepository;

	private final GeometryService geometryService;

	private final ParcelMapper parcelMapper;

	@Transactional
	public ParcelResponse create(CreateParcelRequest request, String ownerId) {
		Polygon boundary = geometryService.toPolygon(request.getGeometry());
		PolygonMeasurements measurements = geometryService.validateAndMeasure(boundary);
		Parcel parcel = Parcel.builder()
				.name(request.getName().trim())
				.ownerId(ownerId)
				.geometry(boundary)
				.areaSquareMeters(measurements.getAreaSquareMeters())
				.perimeterMeters(measurements.getPerimeterMeters())
				// Databases store microseconds; truncating keeps the POST and GET responses identical.
				.createdAt(Instant.now().truncatedTo(ChronoUnit.MICROS))
				.build();
		return parcelMapper.toResponse(parcelRepository.save(parcel));
	}

	@Transactional(readOnly = true)
	public List<ParcelResponse> list(String ownerId) {
		return parcelRepository.findAllByOwnerIdOrderByCreatedAtDesc(ownerId).stream()
				.map(parcelMapper::toResponse).toList();
	}

	@Transactional(readOnly = true)
	public ParcelResponse get(UUID id, String ownerId) {
		return parcelRepository.findByIdAndOwnerId(id, ownerId)
				.map(parcelMapper::toResponse)
				.orElseThrow(() -> new ParcelNotFoundException(id));
	}

	@Transactional
	public void delete(UUID id, String ownerId) {
		if (!parcelRepository.existsByIdAndOwnerId(id, ownerId)) {
			throw new ParcelNotFoundException(id);
		}
		analysisJobRepository.deleteAllByParcel_Id(id);
		parcelRepository.deleteByIdAndOwnerId(id, ownerId);
	}

}
