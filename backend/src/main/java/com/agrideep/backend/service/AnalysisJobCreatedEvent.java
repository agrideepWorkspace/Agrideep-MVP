package com.agrideep.backend.service;

import com.agrideep.backend.dto.AnalysisRequestMessage;

public record AnalysisJobCreatedEvent(AnalysisRequestMessage request) {
}
