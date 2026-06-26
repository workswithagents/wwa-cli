import { SetupOptions, SetupOutput } from "./base";

const DOCKER_COMPOSE = (registryUrl: string) => `version: "3.9"

services:
  # WWA Registry — agent capability registry + heartbeat
  registry:
    image: workswithagents/registry:latest
    container_name: wwa-registry
    ports:
      - "3210:3210"
    environment:
      - REGISTRY_PORT=3210
      - LOG_LEVEL=info
    volumes:
      - wwa-registry-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3210/v1/agents/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  # WWA Gateway — IACP message relay + agent discovery
  gateway:
    image: workswithagents/gateway:latest
    container_name: wwa-gateway
    ports:
      - "8787:8787"
    environment:
      - GATEWAY_PORT=8787
      - REGISTRY_URL=http://registry:3210
      - LOG_LEVEL=info
    depends_on:
      registry:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8787/v1/iacp/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  # Example agent — registers itself on startup
  example-agent:
    image: workswithagents/example-agent:latest
    container_name: wwa-example-agent
    environment:
      - AGENT_ID=example-agent-1
      - AGENT_ENDPOINT=http://gateway:8787
      - REGISTRY_URL=\${REGISTRY_URL:-http://registry:3210}
      - LOG_LEVEL=info
    depends_on:
      gateway:
        condition: service_healthy
    restart: unless-stopped

volumes:
  wwa-registry-data:
`;

export async function generateLocalSetup(opts: SetupOptions): Promise<SetupOutput> {
  const registryUrl = opts.registryUrl || "http://localhost:3210";
  const files: string[] = [];

  // docker-compose.yml
  const composeContent = DOCKER_COMPOSE(registryUrl);
  const composePath = `${opts.projectDir}/docker-compose.wwa.yml`;
  await fsWrite(composePath, composeContent);
  files.push(composePath);

  // .env file for easy configuration
  const envContent = [
    "# WWA Local Setup — Environment",
    `REGISTRY_URL=${registryUrl}`,
    `REGISTRY_PORT=3210`,
    `GATEWAY_PORT=8787`,
    `AGENT_ID=${opts.agentId || "my-agent"}`,
    "",
    "# To start: docker compose -f docker-compose.wwa.yml up -d",
    "# To stop:  docker compose -f docker-compose.wwa.yml down",
    "# Logs:    docker compose -f docker-compose.wwa.yml logs -f",
  ].join("\n");
  const envPath = `${opts.projectDir}/wwa.env`;
  await fsWrite(envPath, envContent);
  files.push(envPath);

  return {
    filesWritten: files,
    instructions: [
      "WWA local setup generated!",
      "",
      "Prerequisites:",
      "  - Docker & Docker Compose installed",
      "",
      "To start:",
      `  docker compose -f docker-compose.wwa.yml --env-file wwa.env up -d`,
      "",
      "This starts:",
      "  - Registry (port 3210) — agent capability registry",
      "  - Gateway (port 8787) — IACP message relay",
      "  - Example agent — auto-registers on startup",
      "",
      "Your generated adapter code should point at:",
      `  WWA_REGISTRY_URL=http://localhost:3210`,
      `  IACP_ENDPOINT=0.0.0.0:8787`,
    ].join("\n"),
  };
}

// Tiny inline fs write — avoids importing fs/promises everywhere
import { writeFile } from "fs/promises";

async function fsWrite(path: string, content: string): Promise<void> {
  // mkdir -p equivalent via path dirname
  const { dirname } = await import("path");
  const { mkdir } = await import("fs/promises");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf-8");
}
