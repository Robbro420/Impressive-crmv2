import { httpServer } from "./app";
import { logger } from "./lib/logger";
import { runStartupMigration } from "./startup";
import { startScheduler } from "./scheduler";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Run idempotent migration + admin account provisioning before accepting traffic
runStartupMigration(logger)
  .then(() => {
    httpServer.listen(port, (err?: Error) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
      startScheduler(logger);
    });
  })
  .catch((err) => {
    logger.error({ err }, "Startup migration failed — server will not start");
    process.exit(1);
  });
