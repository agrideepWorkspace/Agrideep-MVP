package com.agrideep.backend.dto;

import java.time.Instant;
import java.util.UUID;

import com.agrideep.backend.model.PolygonGeometry;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import lombok.Builder;
import lombok.Value;

/** A saved parcel as returned by the API. */
@Value
@Builder
@JsonPropertyOrder({ "id", "name", "geometry", "areaHa", "perimeterM", "createdAt" })
public class ParcelResponse {

	UUID id;

	String name;

	PolygonGeometry geometry;

	/** Hectares, rounded to two decimals like the frontend's parcel form. */
	double areaHa;

	/** Meters, rounded to a whole number like the frontend's parcel form. */
	long perimeterM;

	Instant createdAt;

}
