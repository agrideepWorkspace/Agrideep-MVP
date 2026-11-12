package com.agrideep.backend.exception;

public class AnalysisArtifactNotFoundException extends RuntimeException {

	public AnalysisArtifactNotFoundException() {
		super("The requested analysis artifact is not available.");
	}
}
