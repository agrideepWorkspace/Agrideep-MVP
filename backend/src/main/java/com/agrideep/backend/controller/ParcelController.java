package com.agrideep.backend.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.agrideep.backend.dto.CreateParcelRequest;
import com.agrideep.backend.dto.ParcelResponse;
import com.agrideep.backend.service.ParcelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/parcels")
@RequiredArgsConstructor
public class ParcelController {

	private final ParcelService parcelService;

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

}
