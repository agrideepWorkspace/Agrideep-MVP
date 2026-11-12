package com.agrideep.backend.service;

import java.util.List;

import com.agrideep.backend.exception.InvalidGeometryException;
import com.agrideep.backend.model.LinearRing;
import com.agrideep.backend.model.PolygonGeometry;
import com.agrideep.backend.model.PolygonMeasurements;
import com.agrideep.backend.model.Position;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.geom.PrecisionModel;
import org.locationtech.jts.io.WKBWriter;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Checks that a parcel boundary is a usable GeoJSON Polygon, then validates and measures it with PostGIS.
 * A usable boundary is one closed ring of valid longitude/latitude positions that
 * encloses an area without crossing itself. Polygons with holes are not supported
 * because the parcel map cannot draw them.
 */
@Service
@RequiredArgsConstructor
public class GeometryService {

	/** Hand-drawn parcels have tens of corners; the cap bounds the work done for each request. */
	public static final int MAX_POSITIONS = 2_000;

	/** Boundaries smaller than this, such as corners all on one line, have no usable area. */
	private static final double MIN_AREA_M2 = 1.0;

	/** GeoJSON positions are longitude and latitude on WGS 84 (EPSG:4326). */
	public static final int WGS84_SRID = 4326;

	private static final GeometryFactory WGS84 = new GeometryFactory(new PrecisionModel(), WGS84_SRID);

	/**
	 * Measures on the WGS 84 ellipsoid. The area after ST_MakeValid is zero when the corners are
	 * all on one line, which PostGIS reports as a self-intersection like a ring that crosses itself.
	 */
	private static final String VALIDATE_AND_MEASURE_SQL = """
			SELECT validity.valid, validity.reason,
				ST_Area(boundary::geography) AS area_m2,
				ST_Perimeter(boundary::geography) AS perimeter_m,
				ST_Area(ST_MakeValid(boundary)::geography) AS repaired_area_m2
			FROM ST_GeomFromEWKB(:boundary) AS boundary, ST_IsValidDetail(boundary) AS validity
			""";

	private final JdbcClient jdbcClient;

	/**
	 * Checks the GeoJSON structure and coordinates, and returns the boundary as a 2D polygon in WGS 84.
	 * Altitudes are dropped.
	 * @throws InvalidGeometryException with a message suitable for showing to the user
	 */
	public Polygon toPolygon(PolygonGeometry geometry) {
		if (!PolygonGeometry.TYPE.equals(geometry.getType())) {
			throw new InvalidGeometryException("geometry.type must be \"Polygon\".");
		}

		List<LinearRing> rings = geometry.getCoordinates();
		if (rings == null || rings.isEmpty()) {
			throw new InvalidGeometryException("geometry.coordinates must contain the boundary ring.");
		}
		if (rings.size() > 1) {
			throw new InvalidGeometryException(
					"Polygons with holes are not supported; geometry.coordinates must contain exactly one ring.");
		}

		LinearRing ring = rings.get(0);
		if (ring == null || ring.positions().size() < 4) {
			throw new InvalidGeometryException("geometry.coordinates[0] must have at least 4 positions: "
					+ "three corners and a closing position equal to the first.");
		}
		List<Position> positions = ring.positions();
		if (positions.size() > MAX_POSITIONS) {
			throw new InvalidGeometryException(
					"geometry.coordinates[0] must have at most " + MAX_POSITIONS + " positions.");
		}

		Coordinate[] coordinates = new Coordinate[positions.size()];
		for (int i = 0; i < positions.size(); i++) {
			Position position = positions.get(i);
			checkPosition(position, i);
			coordinates[i] = new Coordinate(position.longitude(), position.latitude());
		}
		if (!coordinates[0].equals2D(coordinates[coordinates.length - 1])) {
			throw new InvalidGeometryException(
					"geometry.coordinates[0] must be closed: its last position must equal its first.");
		}
		return WGS84.createPolygon(coordinates);
	}

	/**
	 * Checks with PostGIS that the boundary is a valid polygon that encloses an area, and returns
	 * its area and perimeter on the WGS 84 ellipsoid.
	 * @throws InvalidGeometryException with a message suitable for showing to the user
	 */
	public PolygonMeasurements validateAndMeasure(Polygon boundary) {
		PostgisResult result = jdbcClient.sql(VALIDATE_AND_MEASURE_SQL)
				.param("boundary", new WKBWriter(2, true).write(boundary))
				.query((row, rowNumber) -> new PostgisResult(row.getBoolean("valid"), row.getString("reason"),
						row.getDouble("area_m2"), row.getDouble("perimeter_m"), row.getDouble("repaired_area_m2")))
				.single();

		if (!result.valid()) {
			throw new InvalidGeometryException(invalidBoundaryMessage(result));
		}
		if (result.areaSquareMeters() < MIN_AREA_M2) {
			throw new InvalidGeometryException("The parcel boundary does not enclose any area.");
		}
		return new PolygonMeasurements(result.areaSquareMeters(), result.perimeterMeters());
	}

	private static String invalidBoundaryMessage(PostgisResult result) {
		if (result.reason().startsWith("Too few points")) {
			return "The parcel boundary must have at least three distinct corners.";
		}
		if (result.repairedAreaSquareMeters() < MIN_AREA_M2) {
			return "The parcel boundary does not enclose any area.";
		}
		if (result.reason().contains("Self-intersection")) {
			return "The parcel boundary crosses itself. Redraw it so that its edges do not cross.";
		}
		return "The parcel boundary is not a valid polygon: " + result.reason() + ".";
	}

	private static void checkPosition(Position position, int index) {
		String path = "geometry.coordinates[0][" + index + "]";
		if (position == null) {
			throw new InvalidGeometryException(
					path + " must be [longitude, latitude] or [longitude, latitude, altitude].");
		}
		double longitude = position.longitude();
		double latitude = position.latitude();
		Double altitude = position.altitude();
		if (!Double.isFinite(longitude) || !Double.isFinite(latitude)
				|| (altitude != null && !Double.isFinite(altitude))) {
			throw new InvalidGeometryException(path + " must contain only finite numbers.");
		}

		if (longitude < -180 || longitude > 180) {
			throw new InvalidGeometryException(path + " has longitude " + longitude
					+ "; longitude must be between -180 and 180.");
		}
		if (latitude < -90 || latitude > 90) {
			throw new InvalidGeometryException(path + " has latitude " + latitude
					+ "; latitude must be between -90 and 90.");
		}
	}

	/** One row of {@link #VALIDATE_AND_MEASURE_SQL}; {@code reason} is null for a valid boundary. */
	private record PostgisResult(boolean valid, String reason, double areaSquareMeters, double perimeterMeters,
			double repairedAreaSquareMeters) {
	}

}
