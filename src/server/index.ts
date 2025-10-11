import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "../config/env";
import { SolidStartClient } from "../integrations/solidstart/client";
import { logger } from "./utils/logger";
import { registerSolidStartTools } from "./tools/solidstartRecipes";
import { registerSolidStartResources } from "./resources/solidstartResources";

async function bootstrap() {
  const server = new McpServer({
    name: "dearbaby-mcp",
    version: "0.1.0",
  });

  const solidStartClient = new SolidStartClient({
    baseURL: config.solidStart.baseUrl,
    apiKey: config.solidStart.apiKey,
  });

  registerSolidStartTools({
    server,
    client: solidStartClient,
    logger,
  });

  registerSolidStartResources(server, logger);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  const httpServer = createServer((req, res) => {
    transport.handleRequest(req, res).catch((error) => {
      logger.error({ err: error }, "Failed to handle HTTP request");
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      } else {
        res.end();
      }
    });
  });

  httpServer.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.env },
      "Dear Baby MCP server listening",
    );
  });

  const shutdown = () => {
    logger.info("Received shutdown signal, closing HTTP server…");
    httpServer.close((error) => {
      if (error) {
        logger.error({ err: error }, "Error while shutting down HTTP server");
        process.exitCode = 1;
      }
      process.exit();
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((error) => {
  logger.error({ err: error }, "Failed to bootstrap MCP server");
  process.exit(1);
});
