package com.agrideep.backend.service;

import com.agrideep.backend.dto.AnalysisWorkerEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "agrideep.analysis.messaging.enabled", havingValue = "true", matchIfMissing = true)
public class AnalysisResultListener {

	private final ObjectMapper objectMapper;

	private final AnalysisJobService analysisJobService;

	@RabbitListener(
			queues = "${agrideep.analysis.result-queue}",
			autoStartup = "${agrideep.analysis.messaging.enabled:true}")
	public void receive(Message message) {
		try {
			AnalysisWorkerEvent event = objectMapper.readValue(message.getBody(), AnalysisWorkerEvent.class);
			analysisJobService.acceptWorkerEvent(event);
		} catch (JacksonException | IllegalArgumentException exception) {
			log.error("Rejecting malformed satellite analysis result message", exception);
			throw new AmqpRejectAndDontRequeueException("Invalid satellite analysis result.", exception);
		}
	}
}
