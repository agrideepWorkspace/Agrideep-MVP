package com.agrideep.backend.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.agrideep.backend.dto.AnalysisJobResponse;
import com.agrideep.backend.dto.CreateAnalysisRequest;
import com.agrideep.backend.service.AnalysisArtifactService;
import com.agrideep.backend.service.AnalysisJobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
public class AnalysisController {

	private final AnalysisJobService analysisJobService;

	private final AnalysisArtifactService analysisArtifactService;

	@PostMapping("/parcels/{parcelId}/analyses")
	public ResponseEntity<AnalysisJobResponse> create(@PathVariable UUID parcelId,
			@Valid @RequestBody CreateAnalysisRequest request) {
		AnalysisJobResponse job = analysisJobService.create(parcelId, request);
		URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
				.path("/analyses/{id}")
				.buildAndExpand(job.getId())
				.toUri();
		return ResponseEntity.accepted().location(location).body(job);
	}

	@GetMapping("/parcels/{parcelId}/analyses")
	public List<AnalysisJobResponse> listForParcel(@PathVariable UUID parcelId) {
		return analysisJobService.listForParcel(parcelId);
	}

	@GetMapping("/analyses/{id}")
	public AnalysisJobResponse get(@PathVariable UUID id) {
		return analysisJobService.get(id);
	}

	@GetMapping("/analyses/{id}/artifacts/{name}")
	public ResponseEntity<Resource> artifact(@PathVariable UUID id, @PathVariable String name) {
		Resource resource = analysisArtifactService.getArtifact(id, name);
		String filename = resource.getFilename();
		MediaType mediaType = MediaTypeFactory.getMediaType(filename).orElse(MediaType.APPLICATION_OCTET_STREAM);
		return ResponseEntity.ok()
				.contentType(mediaType)
				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
				.body(resource);
	}
}
