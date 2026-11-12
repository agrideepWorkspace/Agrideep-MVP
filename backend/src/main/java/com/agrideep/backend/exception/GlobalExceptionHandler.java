package com.agrideep.backend.exception;

import java.util.List;
import java.util.stream.Collectors;

import com.agrideep.backend.dto.ApiErrorResponse;
import com.agrideep.backend.dto.ApiErrorResponse.FieldMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	@ExceptionHandler(InvalidGeometryException.class)
	ResponseEntity<ApiErrorResponse> handleInvalidGeometry(InvalidGeometryException ex) {
		return ResponseEntity.badRequest().body(ApiErrorResponse.of("INVALID_GEOMETRY", ex.getMessage()));
	}

	@ExceptionHandler(ParcelNotFoundException.class)
	ResponseEntity<ApiErrorResponse> handleParcelNotFound(ParcelNotFoundException ex) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse.of("PARCEL_NOT_FOUND", ex.getMessage()));
	}

	@ExceptionHandler(AnalysisJobNotFoundException.class)
	ResponseEntity<ApiErrorResponse> handleAnalysisJobNotFound(AnalysisJobNotFoundException ex) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse.of("ANALYSIS_NOT_FOUND", ex.getMessage()));
	}

	@ExceptionHandler(AnalysisArtifactNotFoundException.class)
	ResponseEntity<ApiErrorResponse> handleAnalysisArtifactNotFound(AnalysisArtifactNotFoundException ex) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiErrorResponse.of("ARTIFACT_NOT_FOUND", ex.getMessage()));
	}

	@ExceptionHandler(InvalidAnalysisRequestException.class)
	ResponseEntity<ApiErrorResponse> handleInvalidAnalysisRequest(InvalidAnalysisRequestException ex) {
		return ResponseEntity.badRequest().body(ApiErrorResponse.of("INVALID_ANALYSIS_REQUEST", ex.getMessage()));
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
		log.error("Unhandled exception", ex);
		return ResponseEntity.internalServerError()
				.body(ApiErrorResponse.of("INTERNAL_ERROR", "An unexpected error occurred."));
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		List<FieldMessage> details = ex.getBindingResult().getFieldErrors().stream()
				.map(error -> new FieldMessage(error.getField(), error.getDefaultMessage()))
				.toList();
		String message = details.stream()
				.map(detail -> detail.getField() + " " + detail.getMessage())
				.collect(Collectors.joining("; "));
		return handleExceptionInternal(ex, ApiErrorResponse.of("VALIDATION_FAILED", message, details), headers,
				status, request);
	}

	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		ApiErrorResponse body = ApiErrorResponse.of("MALFORMED_REQUEST",
				"The request body must be JSON with a \"name\" string and a GeoJSON Polygon \"geometry\".");
		return handleExceptionInternal(ex, body, headers, status, request);
	}

	/** Puts the other Spring MVC errors (unknown path, wrong method, bad id...) in the same shape. */
	@Override
	protected ResponseEntity<Object> createResponseEntity(Object body, HttpHeaders headers, HttpStatusCode statusCode,
			WebRequest request) {
		if (!(body instanceof ApiErrorResponse)) {
			String code = statusCode instanceof HttpStatus status ? status.name() : "HTTP_" + statusCode.value();
			String message = body instanceof ProblemDetail problem && problem.getDetail() != null
					? problem.getDetail()
					: "Request failed with status " + statusCode.value() + ".";
			body = ApiErrorResponse.of(code, message);
		}
		return new ResponseEntity<>(body, headers, statusCode);
	}

}
