package com.agrideep.backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Value;

/**
 * Body of every error response: {@code {"error": {"code": ..., "message": ..., "details": [...]}}}.
 * The frontend shows {@code error.message} to the user.
 */
@Value
public class ApiErrorResponse {

	ApiError error;

	public static ApiErrorResponse of(String code, String message) {
		return of(code, message, List.of());
	}

	public static ApiErrorResponse of(String code, String message, List<FieldMessage> details) {
		return new ApiErrorResponse(new ApiError(code, message, details));
	}

	@Value
	public static class ApiError {

		String code;

		String message;

		@JsonInclude(JsonInclude.Include.NON_EMPTY)
		List<FieldMessage> details;

	}

	@Value
	public static class FieldMessage {

		String field;

		String message;

	}

}
