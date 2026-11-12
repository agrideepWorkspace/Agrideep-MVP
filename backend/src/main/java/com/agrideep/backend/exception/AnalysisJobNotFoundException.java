package com.agrideep.backend.exception;

import java.util.UUID;

public class AnalysisJobNotFoundException extends RuntimeException {

	public AnalysisJobNotFoundException(UUID id) {
		super("Analysis job " + id + " was not found.");
	}
}
