package com.agrideep.backend.model;

import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * A GeoJSON position (RFC 7946, section 3.1.1) in degrees, with an optional altitude in meters.
 * In JSON it stays an array, {@code [longitude, latitude]} or {@code [longitude, latitude, altitude]},
 * so the API and the stored geometries keep the GeoJSON format.
 */
public record Position(double longitude, double latitude, Double altitude) {

	/** Arrays that are not two or three numbers are rejected as a malformed request body. */
	@JsonCreator(mode = JsonCreator.Mode.DELEGATING)
	public static Position fromArray(List<Double> values) {
		if (values.size() < 2 || values.size() > 3 || values.stream().anyMatch(Objects::isNull)) {
			throw new IllegalArgumentException("A position must be [longitude, latitude] or "
					+ "[longitude, latitude, altitude], but was " + values + ".");
		}
		return new Position(values.get(0), values.get(1), values.size() == 3 ? values.get(2) : null);
	}

	@JsonValue
	public List<Double> toArray() {
		return altitude == null ? List.of(longitude, latitude) : List.of(longitude, latitude, altitude);
	}

}
