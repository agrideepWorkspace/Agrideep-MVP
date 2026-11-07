package com.agrideep.backend;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** Runs the tests against a PostgreSQL container with PostGIS, the same image as docker-compose.yml. */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	PostgreSQLContainer postgis() {
		return new PostgreSQLContainer(
				DockerImageName.parse("postgis/postgis:17-3.6-alpine").asCompatibleSubstituteFor("postgres"));
	}

}
