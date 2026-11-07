package com.agrideep.backend.model;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.locationtech.jts.geom.Polygon;

@Entity
@Table(name = "parcels")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED) // for JPA
@AllArgsConstructor(access = AccessLevel.PRIVATE) // for the builder
public class Parcel {

	public static final int MAX_NAME_LENGTH = 120;

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	@Column(nullable = false, length = MAX_NAME_LENGTH)
	private String name;

	/** The boundary as a PostGIS polygon in WGS 84 longitude and latitude. */
	@Column(nullable = false, columnDefinition = "geometry(Polygon, 4326)")
	private Polygon geometry;

	@Column(name = "area_m2", nullable = false)
	private double areaSquareMeters;

	@Column(name = "perimeter_m", nullable = false)
	private double perimeterMeters;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

}
