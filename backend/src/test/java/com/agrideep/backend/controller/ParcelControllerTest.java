package com.agrideep.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.verify;

import com.agrideep.backend.repository.AnalysisJobRepository;
import com.agrideep.backend.TestcontainersConfiguration;
import com.agrideep.backend.repository.ParcelRepository;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.json.JsonCompareMode;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest(properties = {
		"agrideep.analysis.messaging.enabled=false",
		"spring.rabbitmq.listener.simple.auto-startup=false"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ParcelControllerTest {

	/** The request body the frontend sends, as documented in frontend/README.md. */
	private static final String FRONTEND_REQUEST = """
			{
			  "name": "  North Grove Sector A  ",
			  "geometry": {
			    "type": "Polygon",
			    "coordinates": [[[-3.78, 37.77], [-3.77, 37.77], [-3.77, 37.78], [-3.78, 37.77]]]
			  }
			}
			""";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private ParcelRepository parcelRepository;

	@Autowired
	private AnalysisJobRepository analysisJobRepository;

	@Autowired
	private ObjectMapper objectMapper;

	@MockitoBean
	private RabbitTemplate rabbitTemplate;

	@BeforeEach
	void deleteParcels() {
		analysisJobRepository.deleteAll();
		parcelRepository.deleteAll();
	}

	@Test
	void createsParcelFromTheFrontendRequest() throws Exception {
		postParcel(FRONTEND_REQUEST)
				.andExpect(status().isCreated())
				.andExpect(header().string(HttpHeaders.LOCATION,
						matchesPattern("http://localhost/parcels/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}")))
				.andExpect(jsonPath("$.id").isString())
				.andExpect(jsonPath("$.name").value("North Grove Sector A"))
				.andExpect(jsonPath("$.geometry.type").value("Polygon"))
				.andExpect(jsonPath("$.geometry.coordinates[0]", hasSize(4)))
				.andExpect(jsonPath("$.geometry.coordinates[0][2][1]").value(37.78))
				.andExpect(jsonPath("$.areaHa").value(48.9))
				.andExpect(jsonPath("$.perimeterM").value(3408))
				.andExpect(jsonPath("$.createdAt").value(matchesPattern("\\d{4}-\\d{2}-\\d{2}T.*Z")));
	}

	@Test
	void storesBoundariesWithoutAltitudes() throws Exception {
		postParcel(FRONTEND_REQUEST.replace("[-3.78, 37.77]", "[-3.78, 37.77, 512]"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.geometry.coordinates[0][0]", hasSize(2)))
				.andExpect(jsonPath("$.areaHa").value(48.9));
	}

	@Test
	void savedParcelCanBeReadListedAndDeleted() throws Exception {
		var created = postParcel(FRONTEND_REQUEST).andReturn().getResponse();
		String location = created.getHeader(HttpHeaders.LOCATION);

		mvc.perform(get(location))
				.andExpect(status().isOk())
				.andExpect(content().json(created.getContentAsString(), JsonCompareMode.STRICT));

		postParcel(FRONTEND_REQUEST.replace("North Grove Sector A", "South Grove"));
		mvc.perform(get("/parcels"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(2)))
				.andExpect(jsonPath("$[0].name").value("South Grove"))
				.andExpect(jsonPath("$[1].name").value("North Grove Sector A"));

		mvc.perform(delete(location)).andExpect(status().isNoContent());
		mvc.perform(get(location))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code").value("PARCEL_NOT_FOUND"));
		mvc.perform(delete(location)).andExpect(status().isNotFound());
	}

	@Test
	void createsAndPersistsAnAnalysisJobBeforeDispatchingIt() throws Exception {
		String parcelLocation = postParcel(FRONTEND_REQUEST)
				.andReturn()
				.getResponse()
				.getHeader(HttpHeaders.LOCATION);
		String parcelId = parcelLocation.substring(parcelLocation.lastIndexOf('/') + 1);
		String request = """
				{"startDate":"2026-03-01","endDate":"2026-09-30","maxCloudPct":20}
				""";

		var created = mvc.perform(post("/parcels/{id}/analyses", parcelId)
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
				.andExpect(status().isAccepted())
				.andExpect(header().string(HttpHeaders.LOCATION, containsString("/analyses/")))
				.andExpect(jsonPath("$.id").isString())
				.andExpect(jsonPath("$.parcelId").value(parcelId))
				.andExpect(jsonPath("$.parcelName").value("North Grove Sector A"))
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.result").doesNotExist())
				.andReturn();
		String jobId = objectMapper.readTree(created.getResponse().getContentAsString())
				.get("id").asText();

		mvc.perform(get("/analyses/{id}", jobId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("PENDING"));
		mvc.perform(get("/parcels/{id}/analyses", parcelId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$", hasSize(1)))
				.andExpect(jsonPath("$[0].id").value(jobId));

		var persistedJob = analysisJobRepository.findById(java.util.UUID.fromString(jobId)).orElseThrow();
		persistedJob.complete(objectMapper.readTree("""
				{"status":"ok","summary":{"ndvi_mean":0.51},"observations":[]}
				"""));
		analysisJobRepository.save(persistedJob);
		mvc.perform(get("/analyses/{id}", jobId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("COMPLETED"))
				.andExpect(jsonPath("$.result.summary.ndvi_mean").value(0.51));

		var messageCaptor = forClass(Message.class);
		verify(rabbitTemplate).send(eq("agrideep.analysis.requests"), messageCaptor.capture());
		var queuedRequest = objectMapper.readValue(messageCaptor.getValue().getBody(), java.util.Map.class);
		assertThat(queuedRequest.get("job_id")).isEqualTo(jobId);
		assertThat(queuedRequest.get("start_date")).isEqualTo("2026-03-01");
		assertThat(((java.util.Map<?, ?>) queuedRequest.get("geometry")).get("type")).isEqualTo("Polygon");
	}

	@Test
	void rejectsInvalidAnalysisDateRange() throws Exception {
		String parcelLocation = postParcel(FRONTEND_REQUEST)
				.andReturn()
				.getResponse()
				.getHeader(HttpHeaders.LOCATION);
		String parcelId = parcelLocation.substring(parcelLocation.lastIndexOf('/') + 1);

		mvc.perform(post("/parcels/{id}/analyses", parcelId)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"startDate":"2026-09-30","endDate":"2026-03-01"}
						"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("INVALID_ANALYSIS_REQUEST"));
		assertThat(analysisJobRepository.count()).isZero();
	}

	@Test
	void rejectsMissingOrBlankFields() throws Exception {
		postParcel(FRONTEND_REQUEST.replace("  North Grove Sector A  ", " "))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("VALIDATION_FAILED"))
				.andExpect(jsonPath("$.error.message").value("name must not be blank"))
				.andExpect(jsonPath("$.error.details[0].field").value("name"));

		postParcel("{\"name\": \"North Grove\"}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.message").value("geometry must not be null"));

		postParcel(FRONTEND_REQUEST.replace("North Grove Sector A", "x".repeat(121)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.message").value("name must be at most 120 characters"));
	}

	@Test
	void rejectsInvalidGeometry() throws Exception {
		String bowTie = FRONTEND_REQUEST.replace("[[-3.78, 37.77], [-3.77, 37.77], [-3.77, 37.78], [-3.78, 37.77]]",
				"[[-3.78, 37.77], [-3.77, 37.78], [-3.77, 37.77], [-3.78, 37.78], [-3.78, 37.77]]");
		postParcel(bowTie)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("INVALID_GEOMETRY"))
				.andExpect(jsonPath("$.error.message", containsString("crosses itself")))
				.andExpect(jsonPath("$.error.details").doesNotExist());

		postParcel(FRONTEND_REQUEST.replace("[-3.77, 37.78]", "null"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("INVALID_GEOMETRY"))
				.andExpect(jsonPath("$.error.message", containsString("geometry.coordinates[0][2] must be")));
		assertNoParcelsSaved();
	}

	@Test
	void rejectsBodiesThatAreNotParcelJson() throws Exception {
		postParcel("{\"name\": ")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("MALFORMED_REQUEST"));

		postParcel("{\"name\": \"North Grove\", \"geometry\": {\"type\": \"Polygon\", \"coordinates\": [1, 2]}}")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("MALFORMED_REQUEST"));

		for (String position : new String[] { "[-3.77]", "[-3.77, null]", "[-3.77, 37.78, 512, 1]" }) {
			postParcel(FRONTEND_REQUEST.replace("[-3.77, 37.78]", position))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.error.code").value("MALFORMED_REQUEST"));
		}

		mvc.perform(post("/parcels").contentType(MediaType.TEXT_PLAIN).content("North Grove"))
				.andExpect(status().isUnsupportedMediaType())
				.andExpect(jsonPath("$.error.code").value("UNSUPPORTED_MEDIA_TYPE"));
		assertNoParcelsSaved();
	}

	@Test
	void reportsOtherRequestErrorsInTheSameShape() throws Exception {
		mvc.perform(get("/parcels/not-a-uuid"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("BAD_REQUEST"))
				.andExpect(jsonPath("$.error.message").isString());

		mvc.perform(get("/no-such-endpoint"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.error.code").value("NOT_FOUND"));

		mvc.perform(put("/parcels"))
				.andExpect(status().isMethodNotAllowed())
				.andExpect(jsonPath("$.error.code").value("METHOD_NOT_ALLOWED"));
	}

	@Test
	void allowsCrossOriginRequestsFromTheViteDevServer() throws Exception {
		mvc.perform(options("/parcels")
				.header(HttpHeaders.ORIGIN, "http://localhost:5173")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
				.andExpect(status().isOk())
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, containsString("POST")));

		mvc.perform(post("/parcels")
				.header(HttpHeaders.ORIGIN, "http://localhost:5173")
				.contentType(MediaType.APPLICATION_JSON)
				.content(FRONTEND_REQUEST))
				.andExpect(status().isCreated())
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "Location"));
	}

	@Test
	void rejectsCrossOriginRequestsFromOtherSites() throws Exception {
		mvc.perform(options("/parcels")
				.header(HttpHeaders.ORIGIN, "https://evil.example")
				.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
				.andExpect(status().isForbidden());
	}

	private ResultActions postParcel(String body) throws Exception {
		return mvc.perform(post("/parcels").contentType(MediaType.APPLICATION_JSON).content(body));
	}

	private void assertNoParcelsSaved() {
		assertThat(parcelRepository.count()).isZero();
	}

}
