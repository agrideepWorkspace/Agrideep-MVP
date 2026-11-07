package com.agrideep.backend.model;

import java.util.Arrays;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.locationtech.jts.geom.Polygon;

/**
 * A GeoJSON Polygon geometry (RFC 7946, section 3.1.6). The first ring in {@code coordinates}
 * is the boundary; any further rings are holes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PolygonGeometry {

	public static final String TYPE = "Polygon";

	private String type;

	private List<LinearRing> coordinates;

	/** The GeoJSON form of a stored boundary. Stored boundaries have no holes and no altitudes. */
	public static PolygonGeometry from(Polygon polygon) {
		List<Position> positions = Arrays.stream(polygon.getExteriorRing().getCoordinates())
				.map(coordinate -> new Position(coordinate.getX(), coordinate.getY(), null))
				.toList();
		return new PolygonGeometry(TYPE, List.of(new LinearRing(positions)));
	}

}
