package com.agrideep.backend.mapper;

import com.agrideep.backend.dto.ParcelResponse;
import com.agrideep.backend.model.Parcel;
import com.agrideep.backend.model.PolygonGeometry;
import org.springframework.stereotype.Component;

@Component
public class ParcelMapper {

	public ParcelResponse toResponse(Parcel parcel) {
		return ParcelResponse.builder()
				.id(parcel.getId())
				.name(parcel.getName())
				.geometry(PolygonGeometry.from(parcel.getGeometry()))
				.areaHa(Math.round(parcel.getAreaSquareMeters() / 100) / 100.0) // m² to ha, two decimals
				.perimeterM(Math.round(parcel.getPerimeterMeters()))
				.createdAt(parcel.getCreatedAt())
				.build();
	}

}
