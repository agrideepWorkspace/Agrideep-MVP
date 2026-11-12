package com.agrideep.backend.service;

import java.util.List;
import java.util.UUID;

import com.agrideep.backend.dto.AnalysisJobResponse;
import com.agrideep.backend.dto.AnalysisRequestMessage;
import com.agrideep.backend.dto.AnalysisWorkerEvent;
import com.agrideep.backend.dto.CreateAnalysisRequest;
import com.agrideep.backend.exception.AnalysisJobNotFoundException;
import com.agrideep.backend.exception.InvalidAnalysisRequestException;
import com.agrideep.backend.exception.ParcelNotFoundException;
import com.agrideep.backend.model.AnalysisJob;
import com.agrideep.backend.model.AnalysisJobStatus;
import com.agrideep.backend.model.Parcel;
import com.agrideep.backend.model.PolygonGeometry;
import com.agrideep.backend.repository.AnalysisJobRepository;
import com.agrideep.backend.repository.ParcelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnalysisJobService {

	private final AnalysisJobRepository analysisJobRepository;

	private final ParcelRepository parcelRepository;

	private final ApplicationEventPublisher eventPublisher;

	@Transactional
	public AnalysisJobResponse create(UUID parcelId, CreateAnalysisRequest request) {
		if (!request.getStartDate().isBefore(request.getEndDate())) {
			throw new InvalidAnalysisRequestException("startDate must be earlier than endDate.");
		}
		Parcel parcel = parcelRepository.findById(parcelId)
				.orElseThrow(() -> new ParcelNotFoundException(parcelId));
		AnalysisJob job = analysisJobRepository.save(AnalysisJob.builder()
				.parcel(parcel)
				.startDate(request.getStartDate())
				.endDate(request.getEndDate())
				.maxCloudPct(request.getMaxCloudPct())
				.status(AnalysisJobStatus.PENDING)
				.build());
		AnalysisRequestMessage message = new AnalysisRequestMessage(job.getId(),
				PolygonGeometry.from(parcel.getGeometry()), job.getStartDate(), job.getEndDate(),
				job.getMaxCloudPct());
		eventPublisher.publishEvent(new AnalysisJobCreatedEvent(message));
		return AnalysisJobResponse.from(job);
	}

	@Transactional(readOnly = true)
	public AnalysisJobResponse get(UUID id) {
		return analysisJobRepository.findById(id)
				.map(AnalysisJobResponse::from)
				.orElseThrow(() -> new AnalysisJobNotFoundException(id));
	}

	@Transactional(readOnly = true)
	public List<AnalysisJobResponse> listForParcel(UUID parcelId) {
		if (!parcelRepository.existsById(parcelId)) {
			throw new ParcelNotFoundException(parcelId);
		}
		return analysisJobRepository.findAllByParcel_IdOrderByCreatedAtDesc(parcelId).stream()
				.map(AnalysisJobResponse::from)
				.toList();
	}

	@Transactional
	public void acceptWorkerEvent(AnalysisWorkerEvent event) {
		AnalysisJob job = analysisJobRepository.findById(event.jobId())
				.orElseThrow(() -> new AnalysisJobNotFoundException(event.jobId()));
		switch (event.status()) {
			case "RUNNING" -> job.markRunning();
			case "COMPLETED" -> job.complete(event.result());
			case "FAILED" -> job.fail(event.errorCode(), event.errorMessage(), event.result());
			default -> throw new IllegalArgumentException("Unsupported analysis worker status.");
		}
	}

	@Transactional
	public void markDispatchFailed(UUID jobId, String message) {
		analysisJobRepository.findById(jobId).ifPresent(job ->
				job.fail("queue_unavailable", message, null));
	}
}
