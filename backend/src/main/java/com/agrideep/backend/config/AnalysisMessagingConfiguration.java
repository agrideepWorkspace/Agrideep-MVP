package com.agrideep.backend.config;

import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AnalysisMessagingConfiguration {

	@Bean
	Queue analysisRequestQueue(@Value("${agrideep.analysis.request-queue}") String name) {
		return QueueBuilder.durable(name).build();
	}

	@Bean
	Queue analysisResultQueue(@Value("${agrideep.analysis.result-queue}") String name) {
		return QueueBuilder.durable(name).build();
	}
}
