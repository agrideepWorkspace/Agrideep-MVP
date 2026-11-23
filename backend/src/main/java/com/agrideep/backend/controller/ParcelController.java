package com.agrideep.backend.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.agrideep.backend.dto.CreateParcelRequest;
import com.agrideep.backend.dto.ParcelResponse;
import com.agrideep.backend.service.ParcelService;
import com.agrideep.backend.service.ObservationService;
import com.agrideep.backend.dto.ObservationResponse;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/parcels")
@RequiredArgsConstructor
public class ParcelController {

	private final ParcelService parcelService;
	private final ObservationService observationService;

	@PostMapping
	public ResponseEntity<ParcelResponse> create(@Valid @RequestBody CreateParcelRequest request) {
		ParcelResponse parcel = parcelService.create(request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequestUri()
				.path("/{id}")
				.buildAndExpand(parcel.getId())
				.toUri();
		return ResponseEntity.created(location).body(parcel);
	}

	@GetMapping
	public List<ParcelResponse> list() {
		return parcelService.list();
	}

	@GetMapping("/{id}")
	public ParcelResponse get(@PathVariable UUID id) {
		return parcelService.get(id);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable UUID id) {
		parcelService.delete(id);
	}

	@GetMapping("/{parcelId}/observations")
	public List<ObservationResponse> observations(
			@PathVariable UUID parcelId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			@RequestParam(defaultValue = "true") boolean validOnly) {
		LocalDate start = from != null ? from : LocalDate.of(2017, 3, 28);
		LocalDate end = to != null ? to : LocalDate.of(9999, 12, 31);
		return observationService.list(parcelId, start, end, validOnly);
	}

	@GetMapping("/{parcelId}/observations/{observationId}/overlay/{index}.png")
	public ResponseEntity<Resource> overlay(
			@PathVariable UUID parcelId,
			@PathVariable UUID observationId,
			@PathVariable String index) {
		Resource resource = observationService.overlay(parcelId, observationId, index);
		return ResponseEntity.ok()
				.cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(365)).cachePublic().immutable())
				.contentType(org.springframework.http.MediaType.IMAGE_PNG)
				.body(resource);
	}

}
