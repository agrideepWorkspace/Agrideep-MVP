package com.agrideep.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import java.util.ArrayList;
import java.util.List;

import com.agrideep.backend.TestcontainersConfiguration;
import com.agrideep.backend.exception.InvalidGeometryException;
import com.agrideep.backend.model.LinearRing;
import com.agrideep.backend.model.PolygonGeometry;
import com.agrideep.backend.model.PolygonMeasurements;
import com.agrideep.backend.model.Position;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class GeometryServiceTest {

	@Autowired
	private GeometryService geometryService;

	@Test
	void measuresOnTheWgs84Ellipsoid() {
		// Expected values come from GeographicLib: Geodesic.WGS84.Polygon() in its Python package.
		PolygonMeasurements triangle = measure(polygon(
				ring(-3.78, 37.77, -3.77, 37.77, -3.77, 37.78, -3.78, 37.77)));
		assertThat(triangle.getAreaSquareMeters()).isCloseTo(488_954.4280, within(0.01));
		assertThat(triangle.getPerimeterMeters()).isCloseTo(3_408.0541, within(0.001));

		PolygonMeasurements square = measure(polygon(
				ring(-3.786, 37.774, -3.784, 37.774, -3.784, 37.776, -3.786, 37.776, -3.786, 37.774)));
		assertThat(square.getAreaSquareMeters()).isCloseTo(39_113.7201, within(0.01));
		assertThat(square.getPerimeterMeters()).isCloseTo(796.3694, within(0.001));
	}

	@Test
	void ignoresAltitudesAndRepeatedPositions() {
		List<Position> positions = new ArrayList<>(
				ring(-3.78, 37.77, -3.77, 37.77, -3.77, 37.77, -3.77, 37.78).positions());
		positions.set(0, new Position(-3.78, 37.77, 512.0));
		positions.add(new Position(-3.78, 37.77, 512.0));

		assertThat(measure(polygon(new LinearRing(positions))).getAreaSquareMeters())
				.isCloseTo(488_954.4280, within(0.01));
	}

	@Test
	void rejectsOtherGeometryTypes() {
		assertInvalid(new PolygonGeometry("MultiPolygon", List.of(ring(0, 0, 1, 0, 1, 1, 0, 0))),
				"geometry.type must be \"Polygon\"");
		assertInvalid(new PolygonGeometry(null, List.of(ring(0, 0, 1, 0, 1, 1, 0, 0))),
				"geometry.type must be \"Polygon\"");
	}

	@Test
	void rejectsMissingRingsAndHoles() {
		assertInvalid(new PolygonGeometry("Polygon", null), "must contain the boundary ring");
		assertInvalid(new PolygonGeometry("Polygon", List.of()), "must contain the boundary ring");
		assertInvalid(new PolygonGeometry("Polygon", List.of(
				ring(0, 0, 0.01, 0, 0.01, 0.01, 0, 0),
				ring(0.002, 0.001, 0.003, 0.001, 0.003, 0.002, 0.002, 0.001))), "holes are not supported");
	}

	@Test
	void rejectsRingsThatAreTooShortOrTooLong() {
		assertInvalid(polygon(ring(0, 0, 1, 0, 0, 0)), "at least 4 positions");

		List<Position> longRing = new ArrayList<>();
		for (int i = 0; i < GeometryService.MAX_POSITIONS; i++) {
			longRing.add(new Position(Math.cos(i * 0.001) * 0.01, Math.sin(i * 0.001) * 0.01, null));
		}
		longRing.add(longRing.get(0));
		assertInvalid(polygon(new LinearRing(longRing)), "at most 2000 positions");
	}

	@Test
	void rejectsMissingAndNonFinitePositions() {
		List<Position> positions = new ArrayList<>(ring(0, 0, 1, 0, 1, 1, 0, 0).positions());
		positions.set(1, null);
		assertInvalid(polygon(new LinearRing(positions)), "geometry.coordinates[0][1] must be [longitude, latitude]");

		positions.set(1, new Position(1.0, Double.POSITIVE_INFINITY, null));
		assertInvalid(polygon(new LinearRing(positions)), "geometry.coordinates[0][1] must contain only finite numbers");

		positions.set(1, new Position(1.0, 0.0, Double.NaN));
		assertInvalid(polygon(new LinearRing(positions)), "geometry.coordinates[0][1] must contain only finite numbers");
	}

	@Test
	void rejectsOutOfRangeCoordinates() {
		assertInvalid(polygon(ring(0, 0, 181, 0, 1, 1, 0, 0)), "longitude must be between -180 and 180");
		assertInvalid(polygon(ring(0, 0, 1, 95, 1, 1, 0, 0)), "latitude must be between -90 and 90");
	}

	@Test
	void rejectsUnclosedRings() {
		assertInvalid(polygon(ring(0, 0, 1, 0, 1, 1, 0, 1)), "must be closed");
	}

	@Test
	void rejectsBoundariesWithFewerThanThreeDistinctCorners() {
		assertInvalid(polygon(ring(0, 0, 1, 0, 1, 0, 0, 0)), "at least three distinct corners");
	}

	@Test
	void rejectsSelfIntersectingBoundaries() {
		// A bow tie: the edges (0,0)-(1,1) and (1,0)-(0,1) cross.
		assertInvalid(polygon(ring(0, 0, 0.01, 0.01, 0.01, 0, 0, 0.01, 0, 0)), "crosses itself");
		// A spike: the boundary goes out to (0.01, 0.02) and back along the same line.
		assertInvalid(polygon(ring(0, 0, 0.01, 0, 0.01, 0.01, 0.01, 0.02, 0.01, 0.01, 0, 0.01, 0, 0)),
				"crosses itself");
		// A figure eight that touches itself at (0.01, 0.01).
		assertInvalid(polygon(ring(0, 0, 0.01, 0, 0.01, 0.01, 0.02, 0.01, 0.02, 0.02, 0.01, 0.02, 0.01, 0.01,
				0, 0.01, 0, 0)), "crosses itself");
	}

	@Test
	void rejectsBoundariesWithNoArea() {
		// Corners on one line, which PostGIS reports as a self-intersection.
		assertInvalid(polygon(ring(0, 0, 0.01, 0, 0.02, 0, 0, 0)), "does not enclose any area");
		// A valid triangle of about 0.006 m².
		assertInvalid(polygon(ring(0, 0, 0.000001, 0, 0.000001, 0.000001, 0, 0)), "does not enclose any area");
	}

	private void assertInvalid(PolygonGeometry geometry, String expectedMessage) {
		assertThatThrownBy(() -> measure(geometry))
				.isInstanceOf(InvalidGeometryException.class)
				.hasMessageContaining(expectedMessage);
	}

	private PolygonMeasurements measure(PolygonGeometry geometry) {
		return geometryService.validateAndMeasure(geometryService.toPolygon(geometry));
	}

	private static PolygonGeometry polygon(LinearRing ring) {
		return new PolygonGeometry(PolygonGeometry.TYPE, List.of(ring));
	}

	/** Builds a ring from alternating longitude and latitude values. */
	private static LinearRing ring(double... longitudeLatitude) {
		List<Position> positions = new ArrayList<>();
		for (int i = 0; i < longitudeLatitude.length; i += 2) {
			positions.add(new Position(longitudeLatitude[i], longitudeLatitude[i + 1], null));
		}
		return new LinearRing(positions);
	}

}
