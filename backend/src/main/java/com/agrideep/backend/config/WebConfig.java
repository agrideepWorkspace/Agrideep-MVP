package com.agrideep.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Lets the Vite frontend, which runs on another origin, call the API from the browser. */
@Configuration
@EnableConfigurationProperties(CorsProperties.class)
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

	private final CorsProperties corsProperties;

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/**")
				.allowedOrigins(corsProperties.getAllowedOrigins().toArray(String[]::new))
				.allowedMethods("GET", "POST", "DELETE")
				.allowedHeaders("Content-Type")
				.exposedHeaders("Location");
	}

}
