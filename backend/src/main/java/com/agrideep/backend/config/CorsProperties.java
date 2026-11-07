package com.agrideep.backend.config;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** {@code agrideep.cors.*} settings from application.properties or the environment. */
@Getter
@Setter
@ConfigurationProperties(prefix = "agrideep.cors")
public class CorsProperties {

	/** Browser origins allowed to call the API, such as the Vite dev server. */
	private List<String> allowedOrigins = new ArrayList<>();

}
