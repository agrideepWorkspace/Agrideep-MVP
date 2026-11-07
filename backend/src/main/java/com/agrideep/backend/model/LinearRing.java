package com.agrideep.backend.model;

import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * A GeoJSON linear ring (RFC 7946, section 3.1.6): a closed line whose last position equals its first.
 * In JSON it stays an array of positions. Whether it is closed is checked by {@code GeometryService}.
 */
public record LinearRing(List<Position> positions) {

	@JsonCreator(mode = JsonCreator.Mode.DELEGATING)
	public LinearRing {
		Objects.requireNonNull(positions, "positions");
	}

	@JsonValue
	@Override
	public List<Position> positions() {
		return positions;
	}

}
