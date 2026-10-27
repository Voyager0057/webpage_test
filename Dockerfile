FROM node:22-alpine AS web
WORKDIR /src/frontend
RUN npm install --global pnpm@11.25.0
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

FROM maven:3.9.9-eclipse-temurin-21 AS backend
WORKDIR /src/backend
COPY backend/ ./
COPY policies/ /src/policies/
COPY --from=web /src/frontend/dist/ finance-api/src/main/resources/static/
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S homewise && adduser -S homewise -G homewise && mkdir -p /app/.runtime && chown -R homewise:homewise /app/.runtime
COPY --from=backend /src/backend/finance-api/target/finance-api-1.0.0.jar /app/app.jar
USER homewise
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
