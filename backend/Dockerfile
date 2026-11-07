# Build stage: compile the jar with the Maven wrapper.
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

# Download dependencies in their own layer, so they are only fetched again when pom.xml changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -q package -DskipTests && cp target/backend-*.jar app.jar

# Runtime stage: only the JRE and the jar, run as a non-root user.
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S spring && adduser -S spring -G spring
WORKDIR /app
COPY --from=build --chown=spring:spring /workspace/app.jar app.jar
USER spring

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=5 \
	CMD wget -qO- http://localhost:8000/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
