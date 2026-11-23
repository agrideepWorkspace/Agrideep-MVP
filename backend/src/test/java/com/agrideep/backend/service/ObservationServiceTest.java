package com.agrideep.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ObservationServiceTest {

	@Test
	void usesAcquisitionTimeWhenEarthEngineOmitsImageId() {
		String acquiredAt = "2026-11-02T10:11:03.158000+00:00";

		assertThat(ObservationService.observationImageId("", acquiredAt))
				.isEqualTo("acquired_at:2026-11-02T10:11:03.158000+00:00");
		assertThat(ObservationService.observationImageId("sentinel-image", acquiredAt))
				.isEqualTo("sentinel-image");
	}
}
