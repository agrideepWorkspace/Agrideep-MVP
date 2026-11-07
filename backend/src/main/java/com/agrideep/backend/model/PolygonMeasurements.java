package com.agrideep.backend.model;

import lombok.Value;

/** Area and perimeter of a parcel boundary, in square meters and meters. */
@Value
public class PolygonMeasurements {

	double areaSquareMeters;

	double perimeterMeters;

}
