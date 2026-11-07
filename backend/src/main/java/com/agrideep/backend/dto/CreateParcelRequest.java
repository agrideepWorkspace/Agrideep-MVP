package com.agrideep.backend.dto;

import com.agrideep.backend.model.Parcel;
import com.agrideep.backend.model.PolygonGeometry;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Body of {@code POST /parcels}. The geometry is checked by {@code GeometryService}. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateParcelRequest {

	@NotBlank
	@Size(max = Parcel.MAX_NAME_LENGTH, message = "must be at most {max} characters")
	private String name;

	@NotNull
	private PolygonGeometry geometry;

}
