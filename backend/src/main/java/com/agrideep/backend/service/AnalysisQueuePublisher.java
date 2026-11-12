package com.agrideep.backend.service;

import com.agrideep.backend.dto.AnalysisRequestMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
@Slf4j
public class AnalysisQueuePublisher {

	private final RabbitTemplate rabbitTemplate;

	private final ObjectMapper objectMapper;

	private final AnalysisJobService analysisJobService;

	@Value("${agrideep.analysis.request-queue}")
	private String requestQueue;

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void dispatch(AnalysisJobCreatedEvent event) {
		AnalysisRequestMessage request = event.request();
		try {
			MessageProperties properties = new MessageProperties();
			properties.setContentType(MessageProperties.CONTENT_TYPE_JSON);
			properties.setDeliveryMode(MessageProperties.DEFAULT_DELIVERY_MODE);
			rabbitTemplate.send(requestQueue, new Message(objectMapper.writeValueAsBytes(request), properties));
		} catch (RuntimeException exception) {
			log.error("Could not dispatch analysis job {}", request.jobId(), exception);
			analysisJobService.markDispatchFailed(request.jobId(),
					"Could not queue satellite analysis. Check that RabbitMQ is running.");
		}
	}
}
