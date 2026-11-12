package com.agrideep.backend.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

import com.agrideep.backend.exception.AnalysisArtifactNotFoundException;
import com.agrideep.backend.exception.AnalysisJobNotFoundException;
import com.agrideep.backend.repository.AnalysisJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AnalysisArtifactService {

	private static final Map<String, String> ARTIFACT_KEYS = Map.of(
			"observations.csv", "observations_csv",
			"boundary.geojson", "boundary_geojson",
			"orchard-map.png", "map_png",
			"ndvi-map.png", "ndvi_map_png",
			"ndmi-map.png", "ndmi_map_png",
			"ndvi-timeseries.png", "ndvi_chart_png",
			"ndmi-timeseries.png", "ndmi_chart_png",
			"monitoring-report.pdf", "report_pdf");

	private final AnalysisJobRepository analysisJobRepository;

	@Value("${agrideep.analysis.output-directory:data/output}")
	private Path outputDirectory;

	@Transactional(readOnly = true)
	public Resource getArtifact(UUID jobId, String name) {
		var job = analysisJobRepository.findById(jobId)
				.orElseThrow(() -> new AnalysisJobNotFoundException(jobId));
		if (job.getResult() == null) {
			throw new AnalysisArtifactNotFoundException();
		}
		String resultKey = ARTIFACT_KEYS.get(name);
		if (resultKey == null) {
			throw new AnalysisArtifactNotFoundException();
		}
		var artifacts = job.getResult().path("artifacts");
		String relativePath = artifacts.path(resultKey).asText("");
		if (relativePath.isBlank()) {
			throw new AnalysisArtifactNotFoundException();
		}

		Path jobDirectory = outputDirectory.resolve(jobId.toString()).normalize();
		Path artifact = jobDirectory.resolve(relativePath).normalize();
		if (!artifact.startsWith(jobDirectory) || !Files.isRegularFile(artifact)) {
			throw new AnalysisArtifactNotFoundException();
		}
		try {
			return new FileSystemResource(artifact.toRealPath());
		} catch (IOException exception) {
			throw new AnalysisArtifactNotFoundException();
		}
	}
}
