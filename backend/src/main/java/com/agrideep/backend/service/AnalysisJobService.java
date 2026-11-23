package com.agrideep.backend.service;

import java.time.LocalDate;
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
	private final ObservationService observationService;

	@Transactional
	public AnalysisJobResponse create(UUID parcelId, CreateAnalysisRequest request, String ownerId) {
		if (!request.getStartDate().isBefore(request.getEndDate())) {
			throw new InvalidAnalysisRequestException("startDate must be earlier than endDate.");
		}
		Parcel parcel = parcelRepository.findByIdAndOwnerId(parcelId, ownerId)
				.orElseThrow(() -> new ParcelNotFoundException(parcelId));
		LocalDate effectiveStart = request.getStartDate();
		if (!request.isForce()) {
			java.util.Optional<LocalDate> latest = observationService.latestDate(parcelId);
			if (latest.isPresent()) {
				LocalDate incremental = latest.get().plusDays(1);
				if (incremental.isAfter(effectiveStart)) {
					effectiveStart = incremental;
				}
			}
		}
		if (!effectiveStart.isBefore(request.getEndDate())) {
			return analysisJobRepository.findTopByParcel_IdAndParcel_OwnerIdOrderByCreatedAtDesc(parcelId, ownerId)
					.map(AnalysisJobResponse::from)
					.orElseThrow(() -> new InvalidAnalysisRequestException(
							"There is nothing new to process for this parcel."));
		}
		AnalysisJob job = analysisJobRepository.save(AnalysisJob.builder()
				.parcel(parcel)
				.startDate(effectiveStart)
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
	public AnalysisJobResponse get(UUID id, String ownerId) {
		return analysisJobRepository.findByIdAndParcel_OwnerId(id, ownerId)
				.map(AnalysisJobResponse::from)
				.orElseThrow(() -> new AnalysisJobNotFoundException(id));
	}

	@Transactional(readOnly = true)
	public List<AnalysisJobResponse> listForParcel(UUID parcelId, String ownerId) {
		if (!parcelRepository.existsByIdAndOwnerId(parcelId, ownerId)) {
			throw new ParcelNotFoundException(parcelId);
		}
		return analysisJobRepository.findAllByParcel_IdAndParcel_OwnerIdOrderByCreatedAtDesc(parcelId, ownerId).stream()
				.map(AnalysisJobResponse::from)
				.toList();
	}

	@Transactional
	public void acceptWorkerEvent(AnalysisWorkerEvent event) {
		AnalysisJob job = analysisJobRepository.findById(event.jobId())
				.orElseThrow(() -> new AnalysisJobNotFoundException(event.jobId()));
		if (job.getStatus() == AnalysisJobStatus.COMPLETED
				|| job.getStatus() == AnalysisJobStatus.FAILED) {
			if (job.getStatus() == AnalysisJobStatus.COMPLETED
					&& "COMPLETED".equals(event.status())
					&& event.result() != null) {
				observationService.upsertCompleted(event.jobId(), event.result());
			}
			return;
		}
		switch (event.status()) {
			case "RUNNING" -> job.markRunning();
			case "COMPLETED" -> {
				job.complete(event.result());
				observationService.upsertCompleted(event.jobId(), event.result());
			}
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
